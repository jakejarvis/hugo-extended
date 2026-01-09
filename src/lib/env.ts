/**
 * Centralized environment variable handling for hugo-extended.
 *
 * All environment variables are prefixed with `HUGO_` and provide ways to
 * customize the installation and runtime behavior of the package.
 *
 * @module
 */

/**
 * Environment variable configuration schema.
 * Each entry defines a variable's name, aliases, and parsing behavior.
 */
interface EnvVarConfig<T> {
  /** Primary environment variable name */
  name: string;
  /** Alternative names that also work (for convenience) */
  aliases?: string[];
  /** Description for documentation */
  description: string;
  /** Parse the raw string value into the desired type */
  parse: (value: string | undefined) => T;
  /** Default value when not set */
  defaultValue: T;
}

/**
 * Parses a boolean environment variable.
 * Truthy values: "1", "true", "yes", "on" (case-insensitive)
 * Falsy values: "0", "false", "no", "off", undefined, empty string
 */
function parseBoolean(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.toLowerCase().trim();
  return ["1", "true", "yes", "on"].includes(normalized);
}

/**
 * Parses a string environment variable (returns undefined if empty).
 */
function parseString(value: string | undefined): string | undefined {
  if (!value || value.trim() === "") return undefined;
  return value.trim();
}

/**
 * Parses a version string, stripping any leading "v" prefix.
 */
function parseVersion(value: string | undefined): string | undefined {
  const str = parseString(value);
  if (!str) return undefined;
  return str.startsWith("v") ? str.slice(1) : str;
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

/**
 * All supported environment variable configurations.
 */
const ENV_VARS = {
  /**
   * Override the Hugo version to install.
   * When set, ignores the version from package.json.
   *
   * Intentionally not aliased to HUGO_VERSION to avoid confusion and
   * conflicts with Netlify, etc.
   *
   * @example HUGO_OVERRIDE_VERSION=0.139.0 npm install hugo-extended
   */
  overrideVersion: {
    name: "HUGO_OVERRIDE_VERSION",
    aliases: [],
    description: "Override the Hugo version to install",
    parse: parseVersion,
    defaultValue: undefined,
  } satisfies EnvVarConfig<string | undefined>,

  /**
   * Force installation of vanilla Hugo instead of Extended.
   * Useful when SCSS/SASS features aren't needed or to reduce binary size.
   *
   * @example HUGO_NO_EXTENDED=1 npm install hugo-extended
   */
  forceStandard: {
    name: "HUGO_NO_EXTENDED",
    aliases: ["HUGO_FORCE_STANDARD"],
    description: "Force vanilla Hugo instead of Extended edition",
    parse: parseBoolean,
    defaultValue: false,
  } satisfies EnvVarConfig<boolean>,

  /**
   * Skip the postinstall Hugo binary download entirely.
   * Useful for CI caching, Docker layer optimization, or when Hugo is
   * already installed system-wide.
   *
   * @example HUGO_SKIP_DOWNLOAD=1 npm ci
   */
  skipInstall: {
    name: "HUGO_SKIP_DOWNLOAD",
    aliases: [],
    description: "Skip the postinstall binary download",
    parse: parseBoolean,
    defaultValue: false,
  } satisfies EnvVarConfig<boolean>,

  /**
   * Use a pre-existing Hugo binary instead of the bundled one.
   * When set, the package will use this path for all Hugo operations.
   *
   * @example HUGO_BIN_PATH=/usr/local/bin/hugo npm start
   */
  binPath: {
    name: "HUGO_BIN_PATH",
    aliases: [],
    description: "Path to a pre-existing Hugo binary",
    parse: parseString,
    defaultValue: undefined,
  } satisfies EnvVarConfig<string | undefined>,

  /**
   * Override the base URL for downloading Hugo releases.
   * Useful for air-gapped environments, corporate mirrors, or faster
   * regional mirrors.
   *
   * The URL should be the base path where release files are hosted.
   * The version and filename will be appended automatically.
   *
   * @example HUGO_MIRROR_BASE_URL=https://mirror.example.com/hugo npm install
   */
  downloadBaseUrl: {
    name: "HUGO_MIRROR_BASE_URL",
    aliases: [],
    description: "Custom base URL for Hugo release downloads",
    parse: parseString,
    defaultValue: undefined,
  } satisfies EnvVarConfig<string | undefined>,

  /**
   * Skip SHA-256 checksum verification of downloaded files.
   * Use with caution - only recommended for trusted mirrors or development.
   *
   * @example HUGO_SKIP_CHECKSUM=1 npm install hugo-extended
   */
  skipChecksum: {
    name: "HUGO_SKIP_CHECKSUM",
    aliases: ["HUGO_SKIP_VERIFY"],
    description: "Skip SHA-256 checksum verification",
    parse: parseBoolean,
    defaultValue: false,
  } satisfies EnvVarConfig<boolean>,

  /**
   * Suppress installation progress output.
   * Useful for cleaner CI logs or scripted automation.
   *
   * @example HUGO_QUIET=1 npm install hugo-extended
   */
  quiet: {
    name: "HUGO_QUIET",
    aliases: ["HUGO_SILENT"],
    description: "Suppress installation progress output",
    parse: parseBoolean,
    defaultValue: false,
  } satisfies EnvVarConfig<boolean>,
} as const;

/**
 * Typed environment configuration object.
 * Provides a clean API for accessing all Hugo environment variables.
 */
export interface HugoEnvConfig {
  /** Override the Hugo version to install (ignores package.json) */
  overrideVersion: string | undefined;
  /** Force vanilla Hugo instead of Extended edition */
  forceStandard: boolean;
  /** Skip the postinstall binary download */
  skipInstall: boolean;
  /** Path to a pre-existing Hugo binary */
  binPath: string | undefined;
  /** Custom base URL for Hugo release downloads */
  downloadBaseUrl: string | undefined;
  /** Skip SHA-256 checksum verification */
  skipChecksum: boolean;
  /** Suppress installation progress output */
  quiet: boolean;
}

/**
 * Reads and parses all Hugo environment variables.
 *
 * This function reads from `process.env` each time it's called,
 * so it will pick up any runtime changes to environment variables.
 *
 * @returns Parsed environment configuration
 *
 * @example
 * ```typescript
 * import { getEnvConfig } from './lib/env';
 *
 * const config = getEnvConfig();
 * if (config.skipInstall) {
 *   console.log('Skipping installation');
 * }
 * ```
 */
export function getEnvConfig(): HugoEnvConfig {
  return {
    overrideVersion: ENV_VARS.overrideVersion.parse(
      getFirstDefined([
        ENV_VARS.overrideVersion.name,
        ...(ENV_VARS.overrideVersion.aliases ?? []),
      ]),
    ),
    forceStandard: ENV_VARS.forceStandard.parse(
      getFirstDefined([
        ENV_VARS.forceStandard.name,
        ...(ENV_VARS.forceStandard.aliases ?? []),
      ]),
    ),
    skipInstall: ENV_VARS.skipInstall.parse(
      getFirstDefined([
        ENV_VARS.skipInstall.name,
        ...(ENV_VARS.skipInstall.aliases ?? []),
      ]),
    ),
    binPath: ENV_VARS.binPath.parse(
      getFirstDefined([
        ENV_VARS.binPath.name,
        ...(ENV_VARS.binPath.aliases ?? []),
      ]),
    ),
    downloadBaseUrl: ENV_VARS.downloadBaseUrl.parse(
      getFirstDefined([
        ENV_VARS.downloadBaseUrl.name,
        ...(ENV_VARS.downloadBaseUrl.aliases ?? []),
      ]),
    ),
    skipChecksum: ENV_VARS.skipChecksum.parse(
      getFirstDefined([
        ENV_VARS.skipChecksum.name,
        ...(ENV_VARS.skipChecksum.aliases ?? []),
      ]),
    ),
    quiet: ENV_VARS.quiet.parse(
      getFirstDefined([ENV_VARS.quiet.name, ...(ENV_VARS.quiet.aliases ?? [])]),
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
  type:
    config.defaultValue === undefined
      ? "string"
      : typeof config.defaultValue === "boolean"
        ? "boolean"
        : "string",
  default: config.defaultValue,
}));
