import fs from "node:fs/promises";
import path from "node:path";
import { x } from "tinyexec";
import hugo from "../src/hugo";

const OUT_DIR = "src/generated";
const HUGO_TYPES_FILE = "types.ts";
const HUGO_FLAGS_JSON_FILE = "flags.json";

/**
 * Normalized flag "kinds" that we map Hugo/Cobra type tokens into.
 * These directly correspond to TypeScript types we emit.
 */
type FlagKind = "boolean" | "string" | "number" | "string[]" | "number[]";

/**
 * Represents a single CLI flag as parsed from Hugo help output.
 */
type FlagSpec = {
  /** Long flag name, including the leading `--` (e.g. `--baseURL`). */
  long: string;
  /** Optional short flag name, including the leading `-` (e.g. `-b`). */
  short?: string;
  /**
   * Type token printed by Cobra/pflag (e.g. `string`, `int`, `strings`, `file`).
   * Omitted for many boolean flags.
   */
  typeToken?: string;
  /** Derived TS-friendly kind for code generation + argv building. */
  kind: FlagKind;
  /** Human description (wrapped lines merged, defaults/enums stripped out). */
  description: string;
  /**
   * Enum values inferred from patterns like `(debug|info|warn|error)` in the description.
   * When present, we emit a string-literal union instead of a plain `string`.
   */
  enum?: string[];
  /**
   * Default value parsed from a trailing `(default ...)` or `(default is ...)` suffix.
   * Stored as raw text, since Hugo prints defaults in multiple formats.
   */
  defaultRaw?: string;
};

/**
 * Represents a Hugo command’s parsed help metadata.
 */
type CommandSpec = {
  /**
   * Command tokens representing the "path" to the command.
   * Examples: `["server"]`, `["mod","get"]`.
   */
  pathTokens: string[];
  /** Flags listed under the `Flags:` section (command-local). */
  flags: FlagSpec[];
  /** Flags listed under the `Global Flags:` section (persistent/global). */
  globalFlags: FlagSpec[];
  /** Subcommand names listed under the `Available Commands:` section. */
  subcommands: string[];
};

/**
 * Matches a single Hugo flag row in the `Flags:`/`Global Flags:` sections.
 * Examples:
 *  - `-b, --baseURL string   ...`
 *  - `    --cacheDir string  ...`
 *  - `-D, --buildDrafts      ...`
 */
const FLAG_LINE =
  /^\s*(?:(?<short>-[A-Za-z]),\s*)?(?<long>--[A-Za-z0-9][A-Za-z0-9-]*)\s*(?:(?<type>[A-Za-z][A-Za-z0-9]*)\s+)?(?<desc>.+?)\s*$/;

/**
 * Matches a wrapped continuation line for a flag description (indented; not starting with `-`/`--`).
 */
const CONTINUATION_LINE = /^\s{2,}(?<more>[^-\s].+?)\s*$/;

/**
 * Matches section headers like `Flags:` / `Global Flags:` / `Available Commands:`.
 */
const SECTION_HEADER = /^(?<name>[A-Z][A-Za-z ]+):\s*$/;

/**
 * Canonical type tokens emitted by Cobra/pflag in help output.
 * If a captured "type" isn't in this list, it's actually part of the description (common for booleans).
 */
const KNOWN_TYPE_TOKENS = new Set([
  "string",
  "strings",
  "int",
  "int64",
  "uint",
  "uint64",
  "float64",
  "bool",
  "boolean",
  "file",
  "duration",
  "ints",
]);

/**
 * Map Cobra/pflag type tokens to a small set of TS-friendly kinds.
 *
 * @param typeToken - Token printed in help output (e.g. `string`, `int`, `strings`, `file`).
 * @returns A normalized {@link FlagKind} used in code generation.
 */
function mapTypeTokenToKind(typeToken?: string): FlagKind {
  if (!typeToken) return "boolean";
  switch (typeToken.toLowerCase()) {
    case "bool":
    case "boolean":
      return "boolean";
    case "string":
    case "file":
    case "duration":
      return "string";
    case "strings":
      return "string[]";
    case "int":
    case "int64":
    case "uint":
    case "uint64":
    case "float64":
      return "number";
    case "ints":
      return "number[]";
    default:
      // Be conservative: Hugo occasionally prints tokens beyond the common set.
      return "string";
  }
}

/**
 * Extract a trailing default from a help description.
 *
 * Supports:
 * - `(default true)`
 * - `(default "127.0.0.1")`
 * - `(default is hugo.yaml|json|toml)`
 * - `(default -1)`
 *
 * @param desc - Full description string from help output.
 * @returns Cleaned description + raw default (if present).
 */
function extractDefault(desc: string): {
  cleaned: string;
  defaultRaw?: string;
} {
  const re = /\s*\(default(?:\s+is)?\s+([^)]+)\)\s*$/i;
  const m = re.exec(desc);
  if (!m) return { cleaned: desc };

  return {
    cleaned: desc.slice(0, m.index).trimEnd(),
    defaultRaw: m[1].trim(),
  };
}

/**
 * Extract a simple enum from a help description.
 *
 * Looks for a parenthesized `a|b|c` list, e.g.:
 * - `log level (debug|info|warn|error)`
 *
 * @param desc - Full description string from help output.
 * @returns Cleaned description + enum values (if confidently detected).
 */
function extractEnum(desc: string): { cleaned: string; enum?: string[] } {
  const re = /\(([^()]*\|[^()]*)\)/;
  const m = re.exec(desc);
  if (!m) return { cleaned: desc };

  const parts = m[1]
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
  // Guard against false positives: only accept "simple" enum tokens.
  if (parts.length < 2 || parts.some((p) => !/^[A-Za-z0-9._-]+$/.test(p))) {
    return { cleaned: desc };
  }

  const cleaned = (desc.slice(0, m.index) + desc.slice(m.index + m[0].length))
    .replace(/\s{2,}/g, " ")
    .trim();

  return { cleaned, enum: parts };
}

/**
 * Parse a contiguous flag section (either `Flags:` or `Global Flags:`) from help output.
 *
 * @param lines - Entire help output split into lines.
 * @param startIdx - Line index immediately after the section header.
 * @returns Parsed flags, plus the index where parsing stopped.
 */
function parseFlagsFromSection(
  lines: string[],
  startIdx: number,
): { flags: FlagSpec[]; endIdx: number } {
  const out: FlagSpec[] = [];
  let last: FlagSpec | null = null;

  for (let i = startIdx; i < lines.length; i++) {
    const raw = lines[i].replace(/\t/g, "    ").trimEnd();

    // Hugo ends with a standard "Use ..." hint; treat that as a hard stop.
    if (raw.startsWith('Use "hugo ')) return { flags: out, endIdx: i };

    // If we hit another section header (e.g. `Global Flags:` after `Flags:`), stop.
    const header = raw.trim().match(SECTION_HEADER);
    if (header) return { flags: out, endIdx: i };

    const m = raw.match(FLAG_LINE);
    if (m?.groups?.long && m.groups.desc) {
      const long = m.groups.long;

      // Drop `--help` so it doesn't appear in generated option types.
      if (long === "--help") {
        last = null;
        continue;
      }

      // Cobra's help formatting makes the type column optional. For boolean flags, the first
      // word of the description can get mis-captured as a "type". Guard with a whitelist.
      let typeToken: string | undefined = m.groups.type;
      let desc = m.groups.desc.trim();

      if (typeToken && !KNOWN_TYPE_TOKENS.has(typeToken.toLowerCase())) {
        desc = `${typeToken} ${desc}`.trim();
        typeToken = undefined;
      }

      // Pull defaults/enums out of the description while preserving raw values.
      const def = extractDefault(desc);
      desc = def.cleaned;

      const en = extractEnum(desc);
      desc = en.cleaned;

      out.push({
        long,
        short: m.groups.short,
        typeToken,
        kind: mapTypeTokenToKind(typeToken),
        description: desc,
        defaultRaw: def.defaultRaw,
        enum: en.enum,
      });

      last = out[out.length - 1];
      continue;
    }

    // Merge wrapped description lines into the previous flag.
    const c = raw.match(CONTINUATION_LINE);
    if (c?.groups?.more && last) {
      last.description = `${last.description} ${c.groups.more.trim()}`
        .replace(/\s{2,}/g, " ")
        .trim();
    } else {
      last = null;
    }
  }

  return { flags: out, endIdx: lines.length };
}

/**
 * Parse `Available Commands:` names from a help output.
 *
 * @param helpText - Full help output.
 * @returns List of subcommand names (single token each).
 */
function parseAvailableCommands(helpText: string): string[] {
  const lines = helpText.split(/\r?\n/);
  const idx = lines.findIndex((l) => l.trim() === "Available Commands:");
  if (idx === -1) return [];

  const out: string[] = [];
  for (let i = idx + 1; i < lines.length; i++) {
    const raw = lines[i].trimEnd();
    if (raw.trim() === "") continue;

    // Stop on the next section header.
    if (/^[A-Z][A-Za-z ]+:$/.test(raw.trim())) break;

    // Typical format: "  server      Start the embedded web server"
    const mm = raw.match(/^\s{2,}(?<name>[a-z0-9][a-z0-9-]*)\s{2,}.+$/i);
    if (mm?.groups?.name) out.push(mm.groups.name);
  }

  return out;
}

/**
 * Parse the relevant parts of a Hugo command’s help output:
 * - `Flags:`
 * - `Global Flags:`
 * - `Available Commands:`
 *
 * @param helpText - Full help output for a command.
 * @param pathTokens - Command path tokens (e.g. `["server"]`, `["mod","get"]`, `["root"]`).
 * @returns Parsed command metadata.
 */
function parseCommandHelp(helpText: string, pathTokens: string[]): CommandSpec {
  const lines = helpText.split(/\r?\n/);

  let flags: FlagSpec[] = [];
  let globalFlags: FlagSpec[] = [];

  const flagsHeaderIdx = lines.findIndex((l) => l.trim() === "Flags:");
  if (flagsHeaderIdx !== -1) {
    flags = parseFlagsFromSection(lines, flagsHeaderIdx + 1).flags;
  }

  const globalHeaderIdx = lines.findIndex((l) => l.trim() === "Global Flags:");
  if (globalHeaderIdx !== -1) {
    globalFlags = parseFlagsFromSection(lines, globalHeaderIdx + 1).flags;
  }

  const subcommands = parseAvailableCommands(helpText);
  return { pathTokens, flags, globalFlags, subcommands };
}

/**
 * Strip the leading `--` from a long flag name.
 *
 * @param long - Long flag name, e.g. `--baseURL`.
 * @returns Name without the `--` prefix, e.g. `baseURL`.
 */
function normalizeLong(long: string) {
  return long.startsWith("--") ? long.slice(2) : long;
}

/**
 * Convert kebab-case to camelCase. If the name is already mixedCase (e.g. `baseURL`),
 * it is returned as-is.
 *
 * @param name - Flag name without the `--` prefix.
 * @returns JS/TS-friendly property name.
 */
function camelizeIfKebab(name: string) {
  if (!name.includes("-")) return name;
  const [first, ...rest] = name.split("-");
  return (
    first + rest.map((p) => (p ? p[0].toUpperCase() + p.slice(1) : "")).join("")
  );
}

/**
 * Convert tokens to PascalCase (used to generate interface names).
 *
 * @param tokens - Command path tokens (e.g. `["mod","get"]`).
 * @returns PascalCase string (e.g. `ModGet`).
 */
function pascal(tokens: string[]) {
  return tokens.map((t) => (t ? t[0].toUpperCase() + t.slice(1) : "")).join("");
}

/**
 * Convert a normalized {@link FlagKind} + optional enum into a TypeScript type string.
 *
 * @param kind - Normalized kind.
 * @param en - Optional enum values inferred from description.
 * @returns TypeScript type representation for emitted code.
 */
function kindToTs(kind: FlagKind, en?: string[]) {
  if (en?.length) return en.map((v) => JSON.stringify(v)).join(" | ");
  switch (kind) {
    case "boolean":
      return "boolean";
    case "string":
      return "string";
    case "number":
      return "number";
    case "string[]":
      return "string[]";
    case "number[]":
      return "number[]";
  }
}

/**
 * Deduplicate flags by their long name. First occurrence wins.
 *
 * @param flags - Flags to dedupe.
 * @returns Deduped list.
 */
function dedupeByLong(flags: FlagSpec[]): FlagSpec[] {
  const seen = new Map<string, FlagSpec>();
  for (const f of flags) if (!seen.has(f.long)) seen.set(f.long, f);
  return [...seen.values()];
}

/**
 * Emit TypeScript interfaces and helper types for Hugo commands:
 * - `HugoGlobalOptions`
 * - `Hugo<CommandPath>Options` for each command
 * - `HugoCommand` union and `HugoOptionsFor<>` conditional mapping
 *
 * @param globalFlags - Persistent/global flags (from `Global Flags:` sections).
 * @param commands - Command metadata to emit (command-local flags).
 * @returns TypeScript source as a single string.
 */
function emitInterfaces(globalFlags: FlagSpec[], commands: CommandSpec[]) {
  const lines: string[] = [];
  lines.push(`/* eslint-disable */`);
  lines.push(`// AUTO-GENERATED. DO NOT EDIT.`);
  lines.push("");

  lines.push(`export interface HugoGlobalOptions {`);
  for (const f of globalFlags.sort((a, b) => a.long.localeCompare(b.long))) {
    const prop = camelizeIfKebab(normalizeLong(f.long));
    const tsType = kindToTs(f.kind, f.enum);
    const def = f.defaultRaw ? ` (default ${f.defaultRaw})` : "";
    lines.push(`  /** ${f.description}${def} */`);
    lines.push(`  ${prop}?: ${tsType};`);
  }
  lines.push(`}`);
  lines.push("");

  for (const cmd of commands.sort((a, b) =>
    a.pathTokens.join(" ").localeCompare(b.pathTokens.join(" ")),
  )) {
    const name = `Hugo${pascal(cmd.pathTokens)}Options`;
    lines.push(`export interface ${name} extends HugoGlobalOptions {`);
    for (const f of cmd.flags.sort((a, b) => a.long.localeCompare(b.long))) {
      const prop = camelizeIfKebab(normalizeLong(f.long));
      const tsType = kindToTs(f.kind, f.enum);
      const def = f.defaultRaw ? ` (default ${f.defaultRaw})` : "";
      lines.push(`  /** ${f.description}${def} */`);
      lines.push(`  ${prop}?: ${tsType};`);
    }
    lines.push(`}`);
    lines.push("");
  }

  const cmdStrings = commands.map((c) => c.pathTokens.join(" "));
  lines.push(
    `export type HugoCommand = ${cmdStrings.map((s) => JSON.stringify(s)).join(" | ")};`,
  );
  lines.push("");
  lines.push(`export type HugoOptionsFor<C extends HugoCommand> =`);
  for (const cmd of commands) {
    const s = cmd.pathTokens.join(" ");
    const name = `Hugo${pascal(cmd.pathTokens)}Options`;
    lines.push(`  C extends ${JSON.stringify(s)} ? ${name} :`);
  }
  lines.push(`  never;`);
  lines.push("");

  return lines.join("\n");
}

/**
 * Execute the Hugo binary with the provided args and return the help text.
 *
 * Hugo prints help to stdout in the cases we rely on.
 *
 * @param bin - Absolute path to the Hugo executable resolved by this package.
 * @param args - CLI args to pass (e.g. `["server","--help"]`).
 * @returns Help output (stdout).
 */
async function getHelp(bin: string, args: string[]) {
  const out = await x(bin, args, { throwOnError: true });
  return out.stdout;
}

/**
 * Get help text for a command, using the appropriate method.
 * Some commands (like `new`) redirect `--help` to a default subcommand,
 * so we use `help <command>` instead to see the parent command structure.
 *
 * @param bin - Absolute path to the Hugo executable.
 * @param tokens - Command path tokens (e.g. `["new"]`).
 * @returns Help output showing subcommands if they exist.
 */
async function getCommandHelp(bin: string, tokens: string[]) {
  if (tokens.length === 0) {
    return getHelp(bin, ["--help"]);
  }

  // First try using `help <command>` to see if subcommands are listed
  const helpArgs = ["help", ...tokens];
  const helpOutput = await getHelp(bin, helpArgs);

  // If we see "Available Commands:" in the output, use this version
  if (helpOutput.includes("Available Commands:")) {
    return helpOutput;
  }

  // Otherwise fall back to the standard `<command> --help`
  const stdArgs = [...tokens, "--help"];
  return getHelp(bin, stdArgs);
}

/**
 * Main entry point: discovers the Hugo command tree, parses flags, and emits:
 * - `src/types.ts` (types/interfaces)
 * - `src/hugo.spec.json` (runtime spec for argv building)
 */
async function run() {
  const bin = await hugo();

  // BFS over command tree; `[]` means root.
  const queue: string[][] = [[]];
  const visited = new Set<string>();

  const commandSpecs: CommandSpec[] = [];
  const globalFlagsAll: FlagSpec[] = [];

  while (queue.length) {
    const tokens = queue.shift() ?? [];
    const key = tokens.join(" ");
    if (visited.has(key)) continue;
    visited.add(key);

    const helpText = await getCommandHelp(bin, tokens);

    // Root is used only for discovery (naming convenience).
    const pathTokens = tokens.length ? tokens : ["root"];
    const spec = parseCommandHelp(helpText, pathTokens);

    commandSpecs.push(spec);
    globalFlagsAll.push(...spec.globalFlags);

    for (const sub of spec.subcommands) {
      queue.push(tokens.concat([sub]));
    }
  }

  // Global options = union of flags found in `Global Flags:` sections.
  const globalFlags = dedupeByLong(globalFlagsAll);
  const globalLongSet = new Set(globalFlags.map((f) => f.long));

  // Drop root and strip global flags from each command’s local flags to avoid duplicates.
  const cleanedCommands = commandSpecs
    .filter((c) => c.pathTokens[0] !== "root")
    .map((c) => ({
      ...c,
      flags: c.flags.filter((f) => !globalLongSet.has(f.long)),
    }));

  const outDir = path.join(process.cwd(), OUT_DIR);
  await fs.mkdir(outDir, { recursive: true });

  if (HUGO_TYPES_FILE) {
    await fs.writeFile(
      path.join(outDir, HUGO_TYPES_FILE),
      emitInterfaces(globalFlags, cleanedCommands),
      "utf8",
    );
    console.log(`Wrote ${HUGO_TYPES_FILE}`);
  }

  if (HUGO_FLAGS_JSON_FILE) {
    await fs.writeFile(
      path.join(outDir, HUGO_FLAGS_JSON_FILE),
      JSON.stringify(
        {
          globalFlags,
          commands: cleanedCommands.map((c) => ({
            command: c.pathTokens.join(" "),
            flags: c.flags,
          })),
        },
        null,
        2,
      ),
      "utf8",
    );
    console.log(`Wrote ${HUGO_FLAGS_JSON_FILE}`);
  }
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
