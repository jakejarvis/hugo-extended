import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getEnvConfig } from "./env";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * The first Hugo version that uses .pkg installers for macOS.
 * Versions before this use .tar.gz archives.
 *
 * @see https://github.com/gohugoio/hugo/issues/14135
 */
const MACOS_PKG_MIN_VERSION = "0.153.0";

/**
 * Compares two semver version strings.
 *
 * @param a - First version string (e.g., "0.153.0")
 * @param b - Second version string (e.g., "0.152.1")
 * @returns -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const partsA = a.split(".").map((n) => Number.parseInt(n, 10));
  const partsB = b.split(".").map((n) => Number.parseInt(n, 10));

  const maxLen = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < maxLen; i++) {
    const numA = partsA[i] ?? 0;
    const numB = partsB[i] ?? 0;

    if (numA < numB) return -1;
    if (numA > numB) return 1;
  }

  return 0;
}

/**
 * Checks if a version uses .pkg installers for macOS.
 * Hugo v0.153.0+ uses .pkg, earlier versions use .tar.gz.
 *
 * @param version - The Hugo version to check
 * @returns true if the version uses .pkg installers on macOS
 */
export function usesMacOSPkg(version: string): boolean {
  return compareVersions(version, MACOS_PKG_MIN_VERSION) >= 0;
}

/**
 * Gets the Hugo version to install.
 *
 * Resolution order:
 * 1. HUGO_OVERRIDE_VERSION environment variable (if set)
 * 2. `hugoVersion` field in package.json (for emergency overrides)
 * 3. `version` field in package.json (should match Hugo release)
 *
 * @throws {Error} If package.json cannot be found and no override is set
 * @returns The version string (e.g., "0.88.1")
 */
export function getPkgVersion(): string {
  // Check for environment variable override first
  const envConfig = getEnvConfig();
  if (envConfig.overrideVersion) {
    return envConfig.overrideVersion;
  }

  // Walk up from __dirname (dist/lib) to find package.json
  const packageJsonPath = path.join(__dirname, "..", "..", "package.json");

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    return (
      (packageJson as { hugoVersion?: string; version: string }).hugoVersion ||
      packageJson.version
    );
  } catch {
    throw new Error(
      `Could not find or read package.json at ${packageJsonPath}`,
    );
  }
}

/**
 * Generates the full URL to a Hugo release file.
 *
 * By default, downloads from GitHub releases. Can be overridden with
 * HUGO_MIRROR_BASE_URL for mirrors or air-gapped environments.
 *
 * @param version - The Hugo version number (e.g., "0.88.1")
 * @param filename - The release filename (e.g., "hugo_extended_0.88.1_darwin-universal.pkg")
 * @returns The complete download URL for the release file
 */
export function getReleaseUrl(version: string, filename: string): string {
  const envConfig = getEnvConfig();
  if (envConfig.downloadBaseUrl) {
    // Custom mirror: append filename to base URL
    const baseUrl = envConfig.downloadBaseUrl.replace(/\/$/, "");
    return `${baseUrl}/${filename}`;
  }
  // Default: GitHub releases
  return `https://github.com/gohugoio/hugo/releases/download/v${version}/${filename}`;
}

/**
 * Gets the Hugo binary filename for the current platform.
 *
 * @returns "hugo.exe" on Windows, "hugo" on all other platforms
 */
export function getBinFilename(): string {
  return process.platform === "win32" ? "hugo.exe" : "hugo";
}

/**
 * Gets the absolute path to the Hugo binary.
 *
 * Resolution order:
 * 1. HUGO_BIN_PATH environment variable (if set)
 * 2. Local bin directory (./bin/hugo or ./bin/hugo.exe)
 *
 * @returns The absolute path to hugo binary.
 *   On macOS (when using local bin), this is a symlink to "/usr/local/bin/hugo".
 */
export function getBinPath(): string {
  const envConfig = getEnvConfig();
  if (envConfig.binPath) {
    return envConfig.binPath;
  }
  return path.join(__dirname, "..", "..", "bin", getBinFilename());
}

/**
 * Executes the Hugo binary and returns its version string.
 *
 * @param bin - The absolute path to the Hugo binary
 * @returns The version output string (e.g., "hugo v0.88.1-5BC54738+extended darwin/arm64 BuildDate=...")
 * @throws {Error} If the binary cannot be executed
 */
export function getBinVersion(bin: string): string {
  const stdout = execFileSync(bin, ["version"]);
  return stdout.toString().trim();
}

/**
 * Checks if the Hugo binary exists at the specified path.
 *
 * @param bin - The absolute path to check for the Hugo binary
 * @returns `true` if the file exists, `false` if it doesn't
 * @throws {Error} If an unexpected error occurs (other than ENOENT)
 */
export function doesBinExist(bin: string): boolean {
  try {
    if (fs.existsSync(bin)) {
      return true;
    }
  } catch (error: unknown) {
    // something bad happened besides Hugo not existing
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code !== "ENOENT"
    ) {
      throw error;
    }

    return false;
  }
  return false;
}

/**
 * Determines the correct Hugo release filename for the current platform and architecture.
 *
 * Hugo Extended is available for:
 * - macOS: x64 and ARM64 (universal binaries as of v0.102.0)
 * - Linux: x64 and ARM64
 * - Windows: x64 only
 *
 * Other platform/architecture combinations fall back to vanilla Hugo where available.
 * Set HUGO_NO_EXTENDED=1 to force vanilla Hugo even on platforms that support Extended.
 *
 * Note: macOS uses .pkg installers starting from v0.153.0. Earlier versions use .tar.gz.
 *
 * @param version - The Hugo version number (e.g., "0.88.1")
 * @returns The release filename if supported (e.g., "hugo_extended_0.88.1_darwin-universal.pkg"),
 *          or `null` if the platform/architecture combination is not supported
 */
export function getReleaseFilename(version: string): string | null {
  const { platform, arch } = process;
  const envConfig = getEnvConfig();
  const forceStandard = envConfig.forceStandard;

  // Helper to choose between extended and standard edition
  const edition = (extended: string, standard: string): string =>
    forceStandard ? standard : extended;

  // macOS: as of 0.102.0, binaries are universal
  // As of v0.153.0, macOS uses .pkg installers instead of .tar.gz
  if (platform === "darwin" && (arch === "x64" || arch === "arm64")) {
    if (usesMacOSPkg(version)) {
      // v0.153.0+: .pkg installer
      return edition(
        `hugo_extended_${version}_darwin-universal.pkg`,
        `hugo_${version}_darwin-universal.pkg`,
      );
    }
    // Pre-v0.153.0: .tar.gz archive
    return edition(
      `hugo_extended_${version}_darwin-universal.tar.gz`,
      `hugo_${version}_darwin-universal.tar.gz`,
    );
  }

  const filename =
    // Windows x64: Extended available
    platform === "win32" && arch === "x64"
      ? edition(
          `hugo_extended_${version}_windows-amd64.zip`,
          `hugo_${version}_windows-amd64.zip`,
        )
      : // Windows ARM64: Extended not available
        platform === "win32" && arch === "arm64"
        ? `hugo_${version}_windows-arm64.zip`
        : // Linux x64: Extended available
          platform === "linux" && arch === "x64"
          ? edition(
              `hugo_extended_${version}_linux-amd64.tar.gz`,
              `hugo_${version}_linux-amd64.tar.gz`,
            )
          : // Linux ARM64: Extended available
            platform === "linux" && arch === "arm64"
            ? edition(
                `hugo_extended_${version}_linux-arm64.tar.gz`,
                `hugo_${version}_linux-arm64.tar.gz`,
              )
            : // FreeBSD: Extended not available
              platform === "freebsd" && arch === "x64"
              ? `hugo_${version}_freebsd-amd64.tar.gz`
              : // OpenBSD: Extended not available
                platform === "openbsd" && arch === "x64"
                ? `hugo_${version}_openbsd-amd64.tar.gz`
                : // not gonna work :(
                  null;

  return filename;
}

/**
 * Generates the checksums filename for a given Hugo version.
 *
 * @param version - The Hugo version number (e.g., "0.88.1")
 * @returns The checksums filename (e.g., "hugo_0.88.1_checksums.txt")
 */
export function getChecksumFilename(version: string): string {
  return `hugo_${version}_checksums.txt`;
}

/**
 * Determines if a release filename corresponds to Hugo Extended or vanilla Hugo.
 *
 * @param releaseFile - The release filename to check (e.g., "hugo_extended_0.88.1_darwin-universal.pkg")
 * @returns `true` if the release is Hugo Extended, `false` if it's vanilla Hugo
 */
export function isExtended(releaseFile: string): boolean {
  return releaseFile.startsWith("hugo_extended_");
}

/**
 * Logger utility that respects the HUGO_QUIET setting.
 */
export const logger = {
  /**
   * Log an info message (respects HUGO_QUIET).
   */
  info: (message: string): void => {
    if (!getEnvConfig().quiet) {
      console.info(message);
    }
  },

  /**
   * Log a warning message (respects HUGO_QUIET).
   */
  warn: (message: string): void => {
    if (!getEnvConfig().quiet) {
      console.warn(message);
    }
  },

  /**
   * Log an error message (always shown, even in quiet mode).
   */
  error: (message: string): void => {
    console.error(message);
  },
};
