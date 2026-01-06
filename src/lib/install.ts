import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import AdmZip from "adm-zip";
import logSymbols from "log-symbols";
import * as tar from "tar";
import {
  getBinFilename,
  getBinVersion,
  getChecksumFilename,
  getPkgVersion,
  getReleaseFilename,
  getReleaseUrl,
  isExtended,
} from "./utils";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
  const checksums = await response.text();

  // checksums file format: "sha256  filename"
  const expectedChecksum = checksums
    .split("\n")
    .find((line) => line.endsWith(filename))
    ?.split(/\s+/)[0];

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
 * - Downloads the release file and checksums from GitHub
 * - Verifies the integrity of the downloaded file using SHA-256 checksums
 * - Extracts or installs the binary (platform-specific):
 *   - macOS: Uses `sudo installer` to install the .pkg file to /usr/local/bin
 *   - Windows/Linux: Extracts the .zip or .tar.gz archive to the local bin directory
 * - Sets appropriate file permissions on Unix-like systems
 * - Displays the installed Hugo version
 *
 * @throws {Error} If the platform is unsupported, download fails, checksum doesn't match, or installation fails
 * @returns A promise that resolves with the absolute path to the installed Hugo binary
 */
async function install(): Promise<string> {
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
      console.warn(
        `${logSymbols.info} Hugo Extended isn't supported on this platform, downloading vanilla Hugo instead.`,
      );
    }

    // Prepare bin directory
    const binDir = path.join(__dirname, "..", "..", "bin");
    if (!fs.existsSync(binDir)) {
      fs.mkdirSync(binDir, { recursive: true });
    }

    const releaseUrl = getReleaseUrl(version, releaseFile);
    const checksumUrl = getReleaseUrl(version, checksumFile);
    const downloadPath = path.join(binDir, releaseFile);

    console.info(`${logSymbols.info} Downloading ${releaseFile}...`);
    await downloadFile(releaseUrl, downloadPath);

    console.info(`${logSymbols.info} Verifying checksum...`);
    await verifyChecksum(downloadPath, checksumUrl, releaseFile);

    if (process.platform === "darwin") {
      console.info(
        `${logSymbols.info} Installing ${releaseFile} (requires sudo)...`,
      );
      // Run MacOS installer
      const result = spawnSync(
        "sudo",
        ["installer", "-pkg", downloadPath, "-target", "/"],
        {
          stdio: "inherit",
        },
      );

      if (result.error) throw result.error;
      if (result.status !== 0) {
        throw new Error(`Installer failed with exit code ${result.status}`);
      }

      // Cleanup downloaded pkg
      fs.unlinkSync(downloadPath);
    } else {
      console.info(`${logSymbols.info} Extracting...`);

      if (releaseFile.endsWith(".zip")) {
        const zip = new AdmZip(downloadPath);
        zip.extractAllTo(binDir, true);

        // Cleanup zip
        fs.unlinkSync(downloadPath);
      } else if (releaseFile.endsWith(".tar.gz")) {
        await tar.x({
          file: downloadPath,
          cwd: binDir,
        });

        // Cleanup tar.gz
        fs.unlinkSync(downloadPath);
      }

      const binPath = path.join(binDir, binFile);
      if (fs.existsSync(binPath)) {
        fs.chmodSync(binPath, 0o755);
      }
    }

    console.info(`${logSymbols.success} Hugo installed successfully!`);

    // Check version
    if (process.platform === "darwin") {
      console.info(getBinVersion("/usr/local/bin/hugo"));
      return "/usr/local/bin/hugo";
    } else {
      const binPath = path.join(binDir, binFile);
      console.info(getBinVersion(binPath));
      return binPath;
    }
  } catch (error) {
    console.error(`${logSymbols.error} Hugo installation failed. :(`);
    throw error;
  }
}

export default install;
