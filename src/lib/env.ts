/**
 * Centralized environment variable handling for hugo-extended.
 *
 * The package intentionally keeps runtime configuration small. Platform
 * binaries are provided by optional npm packages, and HUGO_BIN_PATH remains as
 * the escape hatch for users who want to provide their own Hugo executable.
 *
 * @module
 */

/**
 * Parses a string environment variable (returns undefined if empty).
 */
function parseString(value: string | undefined): string | undefined {
  if (!value || value.trim() === "") return undefined;
  return value.trim();
}

/**
 * Gets the first defined value from a list of environment variable names.
 */
function getFirstDefined(names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];
    if (value !== undefined && value !== "") {
      return value;
    }
  }
  return undefined;
}

const ENV_VARS = {
  binPath: {
    name: "HUGO_BIN_PATH",
    aliases: [],
    description: "Path to a pre-existing Hugo binary",
    type: "string",
    defaultValue: undefined,
  },
} as const;

/**
 * Typed environment configuration object.
 */
export interface HugoEnvConfig {
  /** Path to a pre-existing Hugo binary */
  binPath: string | undefined;
}

/**
 * Reads and parses all Hugo environment variables.
 *
 * This function reads from `process.env` each time it's called, so it will pick
 * up any runtime changes to environment variables.
 *
 * @returns Parsed environment configuration
 */
export function getEnvConfig(): HugoEnvConfig {
  return {
    binPath: parseString(
      getFirstDefined([ENV_VARS.binPath.name, ...(ENV_VARS.binPath.aliases ?? [])]),
    ),
  };
}

/**
 * Metadata about all supported environment variables.
 * Useful for documentation generation or help output.
 */
export const ENV_VAR_DOCS = Object.entries(ENV_VARS).map(([key, config]) => ({
  key,
  name: config.name,
  aliases: config.aliases ?? [],
  description: config.description,
  type: config.type,
  default: config.defaultValue,
}));
