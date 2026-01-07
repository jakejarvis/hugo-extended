import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Gets the Hugo version to install from package.json.
 *
 * This package's version number (should) always match the Hugo release we want.
 * We check for a `hugoVersion` field in package.json just in case it doesn't
 * match in the future (from pushing an emergency package update, etc.).
 *
 * @throws {Error} If package.json cannot be found
 * @returns The version string (e.g., "0.88.1")
 */
export function getPkgVersion(): string {
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
 * Generates the full GitHub URL to a Hugo release file.
 *
 * @param version - The Hugo version number (e.g., "0.88.1")
 * @param filename - The release filename (e.g., "hugo_extended_0.88.1_darwin-universal.pkg")
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

/**
 * Gets the absolute path to the installed Hugo binary.
 *
 * @returns The absolute path to hugo binary in the local bin directory.
 *   On macOS, this is a symlink to "/usr/local/bin/hugo".
 */
export function getBinPath(): string {
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
 *
 * @param version - The Hugo version number (e.g., "0.88.1")
 * @returns The release filename if supported (e.g., "hugo_extended_0.88.1_darwin-universal.pkg"),
 *          or `null` if the platform/architecture combination is not supported
 */
export function getReleaseFilename(version: string): string | null {
  const { platform, arch } = process;

  const filename =
    // macOS: as of 0.102.0, binaries are universal
    platform === "darwin" && arch === "x64"
      ? `hugo_extended_${version}_darwin-universal.pkg`
      : platform === "darwin" && arch === "arm64"
        ? `hugo_extended_${version}_darwin-universal.pkg`
        : // Windows
          platform === "win32" && arch === "x64"
          ? `hugo_extended_${version}_windows-amd64.zip`
          : platform === "win32" && arch === "arm64"
            ? `hugo_${version}_windows-arm64.zip`
            : // Linux
              platform === "linux" && arch === "x64"
              ? `hugo_extended_${version}_linux-amd64.tar.gz`
              : platform === "linux" && arch === "arm64"
                ? `hugo_extended_${version}_linux-arm64.tar.gz`
                : // FreeBSD
                  platform === "freebsd" && arch === "x64"
                  ? `hugo_${version}_freebsd-amd64.tar.gz`
                  : // OpenBSD
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
