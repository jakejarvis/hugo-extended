import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

import AdmZip from "adm-zip";
import * as tar from "tar";

import {
  getPlatformPackage,
  getPlatformPackageByName,
  HUGO_PLATFORM_PACKAGES,
  type HugoPlatformPackage,
} from "../src/lib/platform";
import { getChecksumFilename, getReleaseUrl } from "../src/lib/utils";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(currentDir, "..");
export const BINARY_PACKAGES_DIR = path.join(ROOT_DIR, "dist-platforms");

export type ArchiveType = "zip" | "tar.gz" | "pkg" | null;

interface GenerateOptions {
  outputDir?: string;
  version?: string;
  packDryRun?: boolean;
}

interface PackageJson {
  name: string;
  version: string;
  description: string;
  license: string;
  repository: {
    type: "git";
    url: string;
  };
  os: NodeJS.Platform[];
  cpu: NodeJS.Architecture[];
  preferUnplugged: true;
  publishConfig: {
    access: "public";
  };
  files: string[];
}

export function getArchiveType(filename: string): ArchiveType {
  if (filename.endsWith(".zip")) return "zip";
  if (filename.endsWith(".tar.gz")) return "tar.gz";
  if (filename.endsWith(".pkg")) return "pkg";
  return null;
}

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

export function createBinaryPackageJson(pkg: HugoPlatformPackage, version: string): PackageJson {
  return {
    name: pkg.packageName,
    version,
    description: `${pkg.extended ? "Hugo Extended" : "Hugo"} binary for ${pkg.os.join(", ")}/${pkg.cpu.join(", ")}`,
    license: "MIT",
    repository: {
      type: "git",
      url: "git+https://github.com/jakejarvis/hugo-extended.git",
    },
    os: [...pkg.os],
    cpu: [...pkg.cpu],
    preferUnplugged: true,
    publishConfig: {
      access: "public",
    },
    files: ["bin", "README.md", "LICENSE"],
  };
}

export function getBinaryPackageDir(
  pkg: HugoPlatformPackage,
  outputDir = BINARY_PACKAGES_DIR,
): string {
  return path.join(outputDir, pkg.directoryName);
}

export function getBinaryPackageBinPath(
  pkg: HugoPlatformPackage,
  outputDir = BINARY_PACKAGES_DIR,
): string {
  return path.join(getBinaryPackageDir(pkg, outputDir), "bin", pkg.binaryName);
}

function readRootPackageVersion(): string {
  const packageJsonPath = path.join(ROOT_DIR, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  return (packageJson as { version: string }).version;
}

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

function sha256(filePath: string): string {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

async function verifyChecksum(filePath: string, version: string, filename: string): Promise<void> {
  const checksumFilename = getChecksumFilename(version);
  const checksumUrl = getReleaseUrl(version, checksumFilename);
  const response = await fetch(checksumUrl);
  if (!response.ok) {
    throw new Error(`Failed to download checksums: ${response.statusText}`);
  }

  const checksums = parseChecksumFile(await response.text());
  const expected = checksums.get(filename);
  if (!expected) {
    throw new Error(`Checksum for ${filename} not found in ${checksumFilename}`);
  }

  const actual = sha256(filePath);
  if (actual !== expected) {
    throw new Error(`Checksum mismatch for ${filename}: expected ${expected}, got ${actual}`);
  }
}

function findFile(startDir: string, filename: string): string | null {
  const entries = fs.readdirSync(startDir, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(startDir, entry.name);
    if (entry.isFile() && entry.name === filename) {
      return entryPath;
    }
    if (entry.isDirectory()) {
      const found = findFile(entryPath, filename);
      if (found) return found;
    }
  }

  return null;
}

async function extractBinary(
  archivePath: string,
  pkg: HugoPlatformPackage,
  destDir: string,
): Promise<void> {
  const archiveType = getArchiveType(archivePath);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "hugo-binary-"));

  try {
    if (archiveType === "pkg") {
      if (process.platform !== "darwin") {
        throw new Error(`Extracting ${path.basename(archivePath)} requires macOS pkgutil`);
      }
      execFileSync("pkgutil", ["--expand-full", archivePath, path.join(tempDir, "expanded")], {
        stdio: "pipe",
      });
    } else if (archiveType === "zip") {
      const zip = new AdmZip(archivePath);
      zip.extractAllTo(tempDir, true);
    } else if (archiveType === "tar.gz") {
      await tar.x({
        file: archivePath,
        cwd: tempDir,
      });
    } else {
      throw new Error(`Unexpected archive type for ${path.basename(archivePath)}`);
    }

    const extractedBinary = findFile(tempDir, pkg.binaryName);
    if (!extractedBinary) {
      throw new Error(`Could not find ${pkg.binaryName} in ${path.basename(archivePath)}`);
    }

    fs.mkdirSync(destDir, { recursive: true });
    const destPath = path.join(destDir, pkg.binaryName);
    fs.copyFileSync(extractedBinary, destPath);

    if (pkg.binaryName === "hugo") {
      fs.chmodSync(destPath, 0o755);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function writePackageFiles(pkg: HugoPlatformPackage, version: string, packageDir: string): void {
  const manifest = createBinaryPackageJson(pkg, version);

  fs.writeFileSync(path.join(packageDir, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  fs.copyFileSync(path.join(ROOT_DIR, "LICENSE"), path.join(packageDir, "LICENSE"));
  fs.writeFileSync(
    path.join(packageDir, "README.md"),
    `# ${pkg.packageName}\n\n` +
      `Platform binary package for ${pkg.extended ? "Hugo Extended" : "Hugo"} v${version}.\n\n` +
      "This package is installed as an optional dependency of `hugo-extended` and is not intended to be used directly.\n",
  );
}

export async function generateBinaryPackage(
  pkg: HugoPlatformPackage,
  options: GenerateOptions = {},
): Promise<string> {
  const version = options.version ?? readRootPackageVersion();
  const outputDir = options.outputDir ?? BINARY_PACKAGES_DIR;
  const packageDir = getBinaryPackageDir(pkg, outputDir);
  const releaseFile = pkg.releaseFilename(version);
  const releaseUrl = getReleaseUrl(version, releaseFile);
  const downloadDir = path.join(outputDir, ".downloads");
  const downloadPath = path.join(downloadDir, releaseFile);

  fs.rmSync(packageDir, { recursive: true, force: true });
  fs.mkdirSync(packageDir, { recursive: true });
  fs.mkdirSync(downloadDir, { recursive: true });

  console.info(`Downloading ${releaseFile}`);
  await downloadFile(releaseUrl, downloadPath);
  await verifyChecksum(downloadPath, version, releaseFile);

  writePackageFiles(pkg, version, packageDir);
  await extractBinary(downloadPath, pkg, path.join(packageDir, "bin"));

  if (options.packDryRun) {
    execFileSync("npm", ["pack", "--dry-run"], {
      cwd: packageDir,
      stdio: "inherit",
    });
  }

  console.info(`Generated ${pkg.packageName} at ${packageDir}`);
  return packageDir;
}

function parsePackageArgument(args: string[]): string | null {
  const index = args.indexOf("--package");
  if (index === -1) return null;

  const value = args[index + 1];
  if (!value) {
    throw new Error("--package requires a package name");
  }
  return value;
}

function selectPackages(args: string[]): HugoPlatformPackage[] {
  const packageName = parsePackageArgument(args);
  if (packageName) {
    const pkg = getPlatformPackageByName(packageName);
    if (!pkg) {
      throw new Error(`Unknown binary package: ${packageName}`);
    }
    return [pkg];
  }

  if (args.includes("--all")) {
    return [...HUGO_PLATFORM_PACKAGES];
  }

  const current = getPlatformPackage();
  if (!current) {
    throw new Error(`No binary package is defined for ${process.platform}/${process.arch}`);
  }
  return [current];
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const selectedPackages = selectPackages(args);
  const packDryRun = args.includes("--pack-dry-run");
  const setGithubEnv = args.includes("--set-github-env");

  const generatedDirs: string[] = [];
  for (const pkg of selectedPackages) {
    generatedDirs.push(await generateBinaryPackage(pkg, { packDryRun }));
  }

  if (setGithubEnv) {
    if (generatedDirs.length !== 1) {
      throw new Error("--set-github-env requires exactly one generated package");
    }
    const pkg = selectedPackages[0];
    if (!pkg) {
      throw new Error("No generated package selected");
    }
    const binPath = getBinaryPackageBinPath(pkg);
    if (!process.env.GITHUB_ENV) {
      throw new Error("GITHUB_ENV is not set");
    }
    fs.appendFileSync(process.env.GITHUB_ENV, `HUGO_BIN_PATH=${binPath}${os.EOL}`);
    console.info(`Set HUGO_BIN_PATH=${binPath}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
