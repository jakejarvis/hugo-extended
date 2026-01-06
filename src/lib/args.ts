import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Flag specification loaded from the generated spec.json file.
 */
type FlagSpec = {
  long: string;
  short?: string;
  typeToken?: string;
  kind: "boolean" | "string" | "number" | "string[]" | "number[]";
  description: string;
  enum?: string[];
  defaultRaw?: string;
};

/**
 * Command specification with its local flags.
 */
type CommandSpec = {
  command: string;
  flags: FlagSpec[];
};

/**
 * The complete spec loaded from spec.json.
 */
type HugoSpec = {
  globalFlags: FlagSpec[];
  commands: CommandSpec[];
};

let cachedSpec: HugoSpec | null = null;

/**
 * Load the Hugo spec from the generated json file (cached after first load).
 *
 * @returns The parsed Hugo spec containing global flags and command-specific flags.
 */
function loadSpec(): HugoSpec {
  if (cachedSpec) return cachedSpec;

  const specPath = path.join(__dirname, "..", "generated", "flags.json");
  const specText = fs.readFileSync(specPath, "utf8");
  cachedSpec = JSON.parse(specText) as HugoSpec;
  return cachedSpec;
}

/**
 * Convert a camelCase property name to kebab-case flag name.
 *
 * @param name - Property name in camelCase (e.g., "buildDrafts").
 * @returns Kebab-case flag name (e.g., "build-drafts").
 *
 * @example
 * camelToKebab("baseURL") // "base-u-r-l"
 * camelToKebab("buildDrafts") // "build-drafts"
 */
function camelToKebab(name: string): string {
  return name.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

/**
 * Find a flag spec by its camelCase property name.
 *
 * @param flags - Array of flag specs to search.
 * @param propName - Property name in camelCase.
 * @returns The matching flag spec, or undefined if not found.
 */
function findFlag(flags: FlagSpec[], propName: string): FlagSpec | undefined {
  const kebab = camelToKebab(propName);
  return flags.find((f) => {
    const flagName = f.long.startsWith("--") ? f.long.slice(2) : f.long;
    return flagName === kebab || flagName === propName;
  });
}

/**
 * Build command-line arguments from a command and options object.
 *
 * This function:
 * 1. Loads the Hugo spec to understand flag types
 * 2. Converts camelCase property names to kebab-case flags
 * 3. Formats values according to their types (boolean, string, number, arrays)
 * 4. Returns an argv array ready to pass to child_process
 *
 * @param command - Hugo command string (e.g., "server", "build", "mod clean").
 * @param options - Options object with camelCase property names.
 * @returns Array of command-line arguments.
 *
 * @example
 * buildArgs("server", { port: 1313, buildDrafts: true })
 * // Returns: ["server", "--port", "1313", "--build-drafts"]
 *
 * @example
 * buildArgs("build", { theme: ["a", "b"], minify: true })
 * // Returns: ["build", "--theme", "a", "--theme", "b", "--minify"]
 */
export function buildArgs(
  command: string,
  options?: Record<string, unknown>,
): string[] {
  const spec = loadSpec();
  const args: string[] = [];

  // Add the command tokens (e.g., "mod clean" becomes ["mod", "clean"])
  args.push(...command.split(" "));

  // If no options, return just the command
  if (!options || Object.keys(options).length === 0) {
    return args;
  }

  // Find the command spec
  const cmdSpec = spec.commands.find((c) => c.command === command);

  // Combine global flags and command-specific flags
  const allFlags = [...spec.globalFlags, ...(cmdSpec?.flags ?? [])];

  // Process each option
  for (const [key, value] of Object.entries(options)) {
    // Skip undefined/null values
    if (value === undefined || value === null) continue;

    // Find the flag spec for this property
    const flagSpec = findFlag(allFlags, key);

    // If we don't have a spec, try to infer the format
    const flagName = flagSpec
      ? flagSpec.long.startsWith("--")
        ? flagSpec.long
        : `--${flagSpec.long}`
      : `--${camelToKebab(key)}`;

    const kind = flagSpec?.kind ?? inferKind(value);

    // Format based on kind
    switch (kind) {
      case "boolean":
        // Only add the flag if true
        if (value === true) {
          args.push(flagName);
        }
        break;

      case "string":
        args.push(flagName, String(value));
        break;

      case "number":
        args.push(flagName, String(value));
        break;

      case "string[]":
        // Repeat the flag for each array element
        if (Array.isArray(value)) {
          for (const item of value) {
            args.push(flagName, String(item));
          }
        }
        break;

      case "number[]":
        // Repeat the flag for each array element
        if (Array.isArray(value)) {
          for (const item of value) {
            args.push(flagName, String(item));
          }
        }
        break;
    }
  }

  return args;
}

/**
 * Infer the kind of a value when we don't have spec information.
 *
 * @param value - The value to inspect.
 * @returns The inferred flag kind.
 */
function inferKind(
  value: unknown,
): "boolean" | "string" | "number" | "string[]" | "number[]" {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  if (Array.isArray(value)) {
    if (value.length > 0 && typeof value[0] === "number") return "number[]";
    return "string[]";
  }
  return "string";
}
