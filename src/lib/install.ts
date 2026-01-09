import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import AdmZip from "adm-zip";
import * as tar from "tar";
import { getEnvConfig } from "./env";
import {
  getBinFilename,
  getBinVersion,
  getChecksumFilename,
  getPkgVersion,
  getReleaseFilename,
  getReleaseUrl,
  isExtended,
  logger,
} from "./utils";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Archive types supported by the installer.
 */
export type ArchiveType = "zip" | "tar.gz" | "pkg" | null;

/**
 * Detects the archive type from a filename based on its extension.
 *
 * @param filename - The filename to check
 * @returns The detected archive type, or null if unknown
 */
export function getArchiveType(filename: string): ArchiveType {
  if (filename.endsWith(".zip")) return "zip";
  if (filename.endsWith(".tar.gz")) return "tar.gz";
  if (filename.endsWith(".pkg")) return "pkg";
  return null;
}

/**
 * Parses a checksums file content into a lookup map.
 *
 * The checksums file format is: "sha256hash  filename" (hash followed by whitespace and filename).
 * This is the standard format used by Hugo releases.
 *
 * @param content - The raw content of the checksums file
 * @returns A Map of filename to SHA-256 hash
 */
export function parseChecksumFile(content: string): Map<string, string> {
  const checksums = new Map<string, string>();

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const tokens = trimmed.split(/\s+/);
    if (tokens.length >= 2) {
      const hash = tokens[0] as string;
      const filename = tokens[tokens.length - 1] as string;
      checksums.set(filename, hash);
    }
  }

  return checksums;
}

/**
 * Downloads a file from a URL to a local destination path.
 *
 * @param url - The URL to download the file from
 * @param dest - The local file path where the downloaded file will be saved
 * @throws {Error} If the download fails or the response is invalid
 * @returns A promise that resolves when the download is complete
 */
async function downloadFile(url: string, dest: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.statusText}`);
  }
  if (!response.body) {
    throw new Error(`No response body from ${url}`);
  }
  await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(dest));
}

/**
 * Verifies that a downloaded file matches its expected SHA-256 checksum.
 *
 * Downloads the checksums file from GitHub, extracts the expected checksum for the
 * specified filename, computes the actual checksum of the local file, and compares them.
 *
 * @param filePath - The local path to the file to verify
 * @param checksumUrl - The URL to the checksums file (usually checksums.txt from the release)
 * @param filename - The name of the file to find in the checksums file
 * @throws {Error} If checksums don't match, the checksums file can't be downloaded, or the filename isn't found
 * @returns A promise that resolves when verification is successful
 */
async function verifyChecksum(
  filePath: string,
  checksumUrl: string,
  filename: string,
): Promise<void> {
  const response = await fetch(checksumUrl);
  if (!response.ok) {
    throw new Error(`Failed to download checksums: ${response.statusText}`);
  }
  const checksumContent = await response.text();
  const checksums = parseChecksumFile(checksumContent);

  const expectedChecksum = checksums.get(filename);
  if (!expectedChecksum) {
    throw new Error(`Checksum for ${filename} not found in checksums file.`);
  }

  const fileBuffer = fs.readFileSync(filePath);
  const hash = crypto.createHash("sha256");
  hash.update(fileBuffer);
  const actualChecksum = hash.digest("hex");

  if (actualChecksum !== expectedChecksum) {
    throw new Error(
      `Checksum mismatch! Expected ${expectedChecksum}, got ${actualChecksum}`,
    );
  }
}

/**
 * Downloads, verifies, and installs Hugo (Extended when available) for the current platform.
 *
 * This function handles the complete installation process:
 * - Determines the correct Hugo release file for the current platform and architecture
 * - Downloads the release file and checksums from GitHub (or custom mirror)
 * - Verifies the integrity of the downloaded file using SHA-256 checksums (unless HUGO_SKIP_CHECKSUM is set)
 * - Extracts or installs the binary (platform-specific):
 *   - macOS: Uses `sudo installer` to install the .pkg file to /usr/local/bin
 *   - Windows/Linux: Extracts the .zip or .tar.gz archive to the local bin directory
 * - Sets appropriate file permissions on Unix-like systems
 * - Displays the installed Hugo version
 *
 * Environment variables that affect installation:
 * - HUGO_OVERRIDE_VERSION: Install a different Hugo version
 * - HUGO_NO_EXTENDED: Force vanilla Hugo instead of Extended
 * - HUGO_MIRROR_BASE_URL: Custom download mirror
 * - HUGO_SKIP_CHECKSUM: Skip SHA-256 verification
 * - HUGO_QUIET: Suppress progress output
 *
 * @throws {Error} If the platform is unsupported, download fails, checksum doesn't match, or installation fails
 * @returns A promise that resolves with the absolute path to the installed Hugo binary
 */
async function install(): Promise<string> {
  const envConfig = getEnvConfig();

  try {
    const version = getPkgVersion();
    const releaseFile = getReleaseFilename(version);
    const checksumFile = getChecksumFilename(version);
    const binFile = getBinFilename();

    if (!releaseFile) {
      throw new Error(
        `Are you sure this platform is supported? See: https://github.com/gohugoio/hugo/releases/tag/v${version}`,
      );
    }

    if (!isExtended(releaseFile)) {
      if (envConfig.forceStandard) {
        logger.info("ℹ️ Installing vanilla Hugo (HUGO_NO_EXTENDED is set).");
      } else {
        logger.warn(
          "ℹ️ Hugo Extended isn't supported on this platform, downloading vanilla Hugo instead.",
        );
      }
    }

    // Prepare bin directory
    const binDir = path.join(__dirname, "..", "..", "bin");
    if (!fs.existsSync(binDir)) {
      fs.mkdirSync(binDir, { recursive: true });
    }

    const releaseUrl = getReleaseUrl(version, releaseFile);
    const checksumUrl = getReleaseUrl(version, checksumFile);
    const downloadPath = path.join(binDir, releaseFile);

    logger.info(`☁️ Downloading ${releaseFile}...`);
    await downloadFile(releaseUrl, downloadPath);

    if (envConfig.skipChecksum) {
      logger.warn(
        "⚠️ Skipping checksum verification (HUGO_SKIP_CHECKSUM is set).",
      );
    } else {
      logger.info("🕵️ Verifying checksum...");
      await verifyChecksum(downloadPath, checksumUrl, releaseFile);
    }

    const archiveType = getArchiveType(releaseFile);

    // macOS .pkg files require special handling with sudo installer
    if (process.platform === "darwin" && archiveType === "pkg") {
      logger.info(`💾 Installing ${releaseFile} (requires sudo)...`);
      // Run MacOS installer
      const result = spawnSync(
        "sudo",
        ["installer", "-pkg", downloadPath, "-target", "/"],
        {
          stdio: envConfig.quiet ? "pipe" : "inherit",
        },
      );

      if (result.error) throw result.error;
      if (result.status !== 0) {
        throw new Error(`Installer failed with exit code ${result.status}`);
      }

      // Cleanup downloaded pkg
      fs.unlinkSync(downloadPath);

      // Create symlink in local bin dir for consistency with other platforms
      const symlinkPath = path.join(binDir, binFile);
      if (
        fs.existsSync(symlinkPath) ||
        fs.lstatSync(symlinkPath, { throwIfNoEntry: false })
      ) {
        fs.unlinkSync(symlinkPath);
      }
      fs.symlinkSync("/usr/local/bin/hugo", symlinkPath);
    } else {
      // All other platforms and macOS pre-0.153.0 (tar.gz) use archive extraction
      logger.info("📦 Extracting...");

      if (archiveType === "zip") {
        const zip = new AdmZip(downloadPath);
        zip.extractAllTo(binDir, true);

        // Cleanup zip
        fs.unlinkSync(downloadPath);
      } else if (archiveType === "tar.gz") {
        await tar.x({
          file: downloadPath,
          cwd: binDir,
        });

        // Cleanup tar.gz
        fs.unlinkSync(downloadPath);
      } else {
        // Defensive: should not happen since unsupported platforms are caught earlier
        throw new Error(
          `Unexpected archive type for ${releaseFile}. Expected .zip, .tar.gz, or .pkg.`,
        );
      }

      const binPath = path.join(binDir, binFile);
      if (fs.existsSync(binPath)) {
        fs.chmodSync(binPath, 0o755);
      }
    }

    logger.info("🎉 Hugo installed successfully!");

    // Check version and return path
    const binPath = path.join(binDir, binFile);
    logger.info(getBinVersion(binPath));
    return binPath;
  } catch (error) {
    logger.error("⛔ Hugo installation failed. :(");
    throw error;
  }
}

export default install;
