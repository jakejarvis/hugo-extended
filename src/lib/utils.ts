import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getEnvConfig } from "./env";
import {
  getPlatformPackage,
  getPlatformPackageSubpath,
  type HugoPlatformPackage,
} from "./platform";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

export type ResolvePackagePath = (specifier: string) => string;

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
 * Gets the Hugo version for this package.
 *
 * Package versions are version-locked to Hugo releases.
 *
 * @throws {Error} If package.json cannot be found
 * @returns The version string (e.g., "0.163.3")
 */
export function getPkgVersion(): string {
  const packageJsonPath = path.join(currentDir, "..", "..", "package.json");

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    return (packageJson as { version: string }).version;
  } catch {
    throw new Error(`Could not find or read package.json at ${packageJsonPath}`);
  }
}

/**
 * Generates the full GitHub URL to a Hugo release file.
 *
 * @param version - The Hugo version number (e.g., "0.163.3")
 * @param filename - The release filename
 * @returns The complete download URL for the release file
 */
export function getReleaseUrl(version: string, filename: string): string {
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

export function getPlatformPackageBinaryPath(
  pkg: HugoPlatformPackage,
  resolvePackagePath: ResolvePackagePath = require.resolve,
): string | null {
  try {
    return resolvePackagePath(`${pkg.packageName}/${getPlatformPackageSubpath(pkg)}`);
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code !== "MODULE_NOT_FOUND" &&
      error.code !== "ERR_MODULE_NOT_FOUND" &&
      error.code !== "ERR_PACKAGE_PATH_NOT_EXPORTED"
    ) {
      throw error;
    }
    return null;
  }
}

/**
 * Gets the absolute path to the Hugo binary if it can be resolved.
 *
 * Resolution order:
 * 1. HUGO_BIN_PATH environment variable
 * 2. The matching @jakejarvis platform binary package
 *
 * @returns The absolute path to the Hugo binary, or null when no platform
 * package is available for the current platform/architecture.
 */
export function getBinPath(): string | null {
  const envConfig = getEnvConfig();
  if (envConfig.binPath) {
    return envConfig.binPath;
  }

  const pkg = getPlatformPackage();
  if (!pkg) {
    return null;
  }

  return getPlatformPackageBinaryPath(pkg);
}

/**
 * Executes the Hugo binary and returns its version string.
 *
 * @param bin - The absolute path to the Hugo binary
 * @returns The version output string
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
    if (error && typeof error === "object" && "code" in error && error.code !== "ENOENT") {
      throw error;
    }

    return false;
  }
  return false;
}

/**
 * Determines the correct Hugo release filename for the current platform and architecture.
 *
 * @param version - The Hugo version number (e.g., "0.163.3")
 * @returns The release filename if supported, or `null` if unsupported
 */
export function getReleaseFilename(version: string): string | null {
  return getPlatformPackage()?.releaseFilename(version) ?? null;
}

/**
 * Generates the checksums filename for a given Hugo version.
 *
 * @param version - The Hugo version number (e.g., "0.163.3")
 * @returns The checksums filename (e.g., "hugo_0.163.3_checksums.txt")
 */
export function getChecksumFilename(version: string): string {
  return `hugo_${version}_checksums.txt`;
}

/**
 * Determines if a release filename corresponds to Hugo Extended or vanilla Hugo.
 *
 * @param releaseFile - The release filename to check
 * @returns `true` if the release is Hugo Extended, `false` if it's vanilla Hugo
 */
export function isExtended(releaseFile: string): boolean {
  return releaseFile.startsWith("hugo_extended_");
}

export const logger = {
  info: (message: string): void => {
    console.info(message);
  },

  warn: (message: string): void => {
    console.warn(`⚠ ${message}`);
  },

  error: (message: string): void => {
    console.error(`✖ ${message}`);
  },
};
