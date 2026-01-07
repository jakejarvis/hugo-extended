import { spawn } from "node:child_process";
import type { HugoCommand, HugoOptionsFor } from "./generated/types";
import { buildArgs } from "./lib/args";
import install from "./lib/install";
import { doesBinExist, getBinPath } from "./lib/utils";

/**
 * Gets the path to the Hugo binary, automatically installing it if it's missing.
 *
 * This is the main entry point for the hugo-extended package. It checks if Hugo
 * is already installed and available, and if not, triggers an automatic installation
 * before returning the binary path.
 *
 * This handles the case where Hugo may mysteriously disappear (see issue #81),
 * ensuring the binary is always available when this function is called.
 *
 * @returns A promise that resolves with the absolute path to the Hugo binary
 * @throws {Error} If installation fails or the platform is unsupported
 *
 * @example
 * ```typescript
 * import hugo from 'hugo-extended';
 *
 * const hugoPath = await hugo();
 * console.log(hugoPath); // "/usr/local/bin/hugo" or "./bin/hugo"
 * ```
 */
export const getHugoBinary = async (): Promise<string> => {
  const bin = getBinPath();

  // A fix for fleeting ENOENT errors, where Hugo seems to disappear. For now,
  // just reinstall Hugo when it's missing and then continue normally like
  // nothing happened.
  // See: https://github.com/jakejarvis/hugo-extended/issues/81
  if (!doesBinExist(bin)) {
    // Hugo isn't there for some reason. Try re-installing.
    console.info("⚠️ Hugo is missing, reinstalling now...");
    await install();
  }

  return bin;
};

/**
 * Execute a Hugo command with type-safe options.
 *
 * This function runs Hugo with the specified command and options, inheriting stdio
 * so output goes directly to the console. It's perfect for interactive commands
 * like `hugo server` or build commands where you want to see live output.
 *
 * @param command - Hugo command to execute (e.g., "server", "build", "mod clean")
 * @param positionalArgsOrOptions - Either positional arguments array or options object
 * @param options - Type-safe options object (if first param is positional args)
 * @returns A promise that resolves when the command completes successfully
 * @throws {Error} If the command fails or Hugo is not available
 *
 * @example
 * ```typescript
 * import { exec } from 'hugo-extended';
 *
 * // Start development server
 * await exec("server", {
 *   port: 1313,
 *   buildDrafts: true,
 *   baseURL: "http://localhost:1313"
 * });
 *
 * // Create a new site
 * await exec("new site", ["my-site"], { format: "yaml" });
 *
 * // Build site for production
 * await exec("build", {
 *   minify: true,
 *   cleanDestinationDir: true
 * });
 * ```
 */
export async function exec<C extends HugoCommand>(
  command: C,
  positionalArgsOrOptions?: string[] | HugoOptionsFor<C>,
  options?: HugoOptionsFor<C>,
): Promise<void> {
  const bin = await getHugoBinary();

  // Handle overloaded parameters
  let positionalArgs: string[] | undefined;
  let opts: HugoOptionsFor<C> | undefined;

  if (Array.isArray(positionalArgsOrOptions)) {
    positionalArgs = positionalArgsOrOptions;
    opts = options;
  } else {
    positionalArgs = undefined;
    opts = positionalArgsOrOptions;
  }

  const args = buildArgs(
    command,
    positionalArgs,
    opts as Record<string, unknown>,
  );

  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: "inherit" });

    child.on("exit", (code) => {
      if (code === 0 || code === null) {
        resolve();
      } else {
        reject(new Error(`Hugo command failed with exit code ${code}`));
      }
    });

    child.on("error", (err) => {
      reject(err);
    });
  });
}

/**
 * Execute a Hugo command and capture its output.
 *
 * This function runs Hugo with the specified command and options, capturing
 * stdout and stderr. It's useful for commands where you need to process the
 * output programmatically, like `hugo version` or `hugo list all`.
 *
 * @param command - Hugo command to execute (e.g., "version", "list all")
 * @param positionalArgsOrOptions - Either positional arguments array or options object
 * @param options - Type-safe options object (if first param is positional args)
 * @returns A promise that resolves with stdout and stderr strings
 * @throws {Error} If the command fails or Hugo is not available
 *
 * @example
 * ```typescript
 * import { execWithOutput } from 'hugo-extended';
 *
 * // Get Hugo version
 * const { stdout } = await execWithOutput("version");
 * console.log(stdout); // "hugo v0.154.3+extended ..."
 *
 * // List all content
 * const { stdout: content } = await execWithOutput("list all");
 * const pages = content.split('\n');
 * ```
 */
export async function execWithOutput<C extends HugoCommand>(
  command: C,
  positionalArgsOrOptions?: string[] | HugoOptionsFor<C>,
  options?: HugoOptionsFor<C>,
): Promise<{ stdout: string; stderr: string }> {
  const bin = await getHugoBinary();

  // Handle overloaded parameters
  let positionalArgs: string[] | undefined;
  let opts: HugoOptionsFor<C> | undefined;

  if (Array.isArray(positionalArgsOrOptions)) {
    positionalArgs = positionalArgsOrOptions;
    opts = options;
  } else {
    positionalArgs = undefined;
    opts = positionalArgsOrOptions;
  }

  const args = buildArgs(
    command,
    positionalArgs,
    opts as Record<string, unknown>,
  );

  return new Promise((resolve, reject) => {
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    const child = spawn(bin, args);

    if (child.stdout) {
      child.stdout.on("data", (chunk: Buffer) => {
        stdoutChunks.push(chunk);
      });
    }

    if (child.stderr) {
      child.stderr.on("data", (chunk: Buffer) => {
        stderrChunks.push(chunk);
      });
    }

    child.on("exit", (code) => {
      const stdout = Buffer.concat(stdoutChunks).toString("utf8");
      const stderr = Buffer.concat(stderrChunks).toString("utf8");

      if (code === 0 || code === null) {
        resolve({ stdout, stderr });
      } else {
        reject(
          new Error(
            `Hugo command failed with exit code ${code}${stderr ? `\n${stderr}` : ""}`,
          ),
        );
      }
    });

    child.on("error", (err) => {
      reject(err);
    });
  });
}

/**
 * Builder-style API for executing Hugo commands.
 *
 * Provides a fluent interface where each Hugo command is a method on the
 * builder object. All methods are type-safe with autocomplete for options.
 *
 * @example
 * ```typescript
 * import { hugo } from 'hugo-extended';
 *
 * // Start server
 * await hugo.server({ port: 1313, buildDrafts: true });
 *
 * // Build site
 * await hugo.build({ minify: true });
 *
 * // Module operations
 * await hugo.mod.clean({ all: true });
 * await hugo.mod.get();
 * ```
 */
export const hugo = {
  /** Build your site */
  build: (options?: HugoOptionsFor<"build">) => exec("build", options),

  /** Generate shell completion scripts */
  completion: {
    bash: (options?: HugoOptionsFor<"completion bash">) =>
      exec("completion bash", options),
    fish: (options?: HugoOptionsFor<"completion fish">) =>
      exec("completion fish", options),
    powershell: (options?: HugoOptionsFor<"completion powershell">) =>
      exec("completion powershell", options),
    zsh: (options?: HugoOptionsFor<"completion zsh">) =>
      exec("completion zsh", options),
  },

  /** Print Hugo configuration */
  config: (options?: HugoOptionsFor<"config">) => exec("config", options),

  /** Convert content to different formats */
  convert: {
    toJSON: (options?: HugoOptionsFor<"convert toJSON">) =>
      exec("convert toJSON", options),
    toTOML: (options?: HugoOptionsFor<"convert toTOML">) =>
      exec("convert toTOML", options),
    toYAML: (options?: HugoOptionsFor<"convert toYAML">) =>
      exec("convert toYAML", options),
  },

  /** Print Hugo environment info */
  env: (options?: HugoOptionsFor<"env">) => exec("env", options),

  /** Generate documentation */
  gen: {
    doc: (options?: HugoOptionsFor<"gen doc">) => exec("gen doc", options),
    man: (options?: HugoOptionsFor<"gen man">) => exec("gen man", options),
  },

  /** Import your site from others */
  import: {
    jekyll: (options?: HugoOptionsFor<"import jekyll">) =>
      exec("import jekyll", options),
  },

  /** List various types of content */
  list: {
    all: (options?: HugoOptionsFor<"list all">) => exec("list all", options),
    drafts: (options?: HugoOptionsFor<"list drafts">) =>
      exec("list drafts", options),
    expired: (options?: HugoOptionsFor<"list expired">) =>
      exec("list expired", options),
    future: (options?: HugoOptionsFor<"list future">) =>
      exec("list future", options),
    published: (options?: HugoOptionsFor<"list published">) =>
      exec("list published", options),
  },

  /** Module operations */
  mod: {
    clean: (options?: HugoOptionsFor<"mod clean">) =>
      exec("mod clean", options),
    get: (options?: HugoOptionsFor<"mod get">) => exec("mod get", options),
    graph: (options?: HugoOptionsFor<"mod graph">) =>
      exec("mod graph", options),
    init: (options?: HugoOptionsFor<"mod init">) => exec("mod init", options),
    npm: {
      pack: (options?: HugoOptionsFor<"mod npm pack">) =>
        exec("mod npm pack", options),
    },
    tidy: (options?: HugoOptionsFor<"mod tidy">) => exec("mod tidy", options),
    vendor: (options?: HugoOptionsFor<"mod vendor">) =>
      exec("mod vendor", options),
    verify: (options?: HugoOptionsFor<"mod verify">) =>
      exec("mod verify", options),
  },

  /** Create new content */
  new: Object.assign(
    (
      pathOrOptions?: string | HugoOptionsFor<"new">,
      options?: HugoOptionsFor<"new">,
    ) => {
      if (typeof pathOrOptions === "string") {
        return exec("new", [pathOrOptions], options);
      }
      return exec("new", pathOrOptions);
    },
    {
      content: (
        pathOrOptions?: string | HugoOptionsFor<"new content">,
        options?: HugoOptionsFor<"new content">,
      ) => {
        if (typeof pathOrOptions === "string") {
          return exec("new content", [pathOrOptions], options);
        }
        return exec("new content", pathOrOptions);
      },
      site: (
        pathOrOptions?: string | HugoOptionsFor<"new site">,
        options?: HugoOptionsFor<"new site">,
      ) => {
        if (typeof pathOrOptions === "string") {
          return exec("new site", [pathOrOptions], options);
        }
        return exec("new site", pathOrOptions);
      },
      theme: (
        nameOrOptions?: string | HugoOptionsFor<"new theme">,
        options?: HugoOptionsFor<"new theme">,
      ) => {
        if (typeof nameOrOptions === "string") {
          return exec("new theme", [nameOrOptions], options);
        }
        return exec("new theme", nameOrOptions);
      },
    },
  ),

  /** Start the Hugo development server */
  server: (options?: HugoOptionsFor<"server">) => exec("server", options),

  /** Print the Hugo version */
  version: (options?: HugoOptionsFor<"version">) => exec("version", options),
};

// Backward compatibility: default export still returns the binary path
const hugoCompat = getHugoBinary;

// Make the default export callable AND have builder properties
export default Object.assign(hugoCompat, hugo);

// Re-export types for convenience
export type { HugoCommand, HugoOptionsFor } from "./generated/types";
