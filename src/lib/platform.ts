/**
 * Platform-specific npm packages that provide Hugo binaries.
 *
 * Package names intentionally include "hugo-extended" only where the upstream
 * Hugo release actually ships the Extended edition for that target.
 */

export interface HugoPlatformPackage {
  /** npm package containing the binary */
  packageName: string;
  /** Directory name used when generating publishable package folders */
  directoryName: string;
  /** npm os field values */
  os: NodeJS.Platform[];
  /** npm cpu field values */
  cpu: NodeJS.Architecture[];
  /** Binary filename inside the package's bin directory */
  binaryName: "hugo" | "hugo.exe";
  /** Whether the upstream asset is Hugo Extended */
  extended: boolean;
  /** Hugo release asset to download for this package */
  releaseFilename: (version: string) => string;
}

export const HUGO_PLATFORM_PACKAGES = [
  {
    packageName: "@jakejarvis/hugo-extended-darwin-universal",
    directoryName: "hugo-extended-darwin-universal",
    os: ["darwin"],
    cpu: ["x64", "arm64"],
    binaryName: "hugo",
    extended: true,
    releaseFilename: (version: string) => `hugo_extended_${version}_darwin-universal.pkg`,
  },
  {
    packageName: "@jakejarvis/hugo-extended-linux-amd64",
    directoryName: "hugo-extended-linux-amd64",
    os: ["linux"],
    cpu: ["x64"],
    binaryName: "hugo",
    extended: true,
    releaseFilename: (version: string) => `hugo_extended_${version}_linux-amd64.tar.gz`,
  },
  {
    packageName: "@jakejarvis/hugo-extended-linux-arm64",
    directoryName: "hugo-extended-linux-arm64",
    os: ["linux"],
    cpu: ["arm64"],
    binaryName: "hugo",
    extended: true,
    releaseFilename: (version: string) => `hugo_extended_${version}_linux-arm64.tar.gz`,
  },
  {
    packageName: "@jakejarvis/hugo-extended-windows-amd64",
    directoryName: "hugo-extended-windows-amd64",
    os: ["win32"],
    cpu: ["x64"],
    binaryName: "hugo.exe",
    extended: true,
    releaseFilename: (version: string) => `hugo_extended_${version}_windows-amd64.zip`,
  },
  {
    packageName: "@jakejarvis/hugo-windows-arm64",
    directoryName: "hugo-windows-arm64",
    os: ["win32"],
    cpu: ["arm64"],
    binaryName: "hugo.exe",
    extended: false,
    releaseFilename: (version: string) => `hugo_${version}_windows-arm64.zip`,
  },
] as const satisfies readonly HugoPlatformPackage[];

export function getPlatformPackage(
  platform: NodeJS.Platform = process.platform,
  arch: NodeJS.Architecture = process.arch,
): HugoPlatformPackage | null {
  return (
    HUGO_PLATFORM_PACKAGES.find(
      (pkg) =>
        (pkg.os as readonly NodeJS.Platform[]).includes(platform) &&
        (pkg.cpu as readonly NodeJS.Architecture[]).includes(arch),
    ) ?? null
  );
}

export function getPlatformPackageSubpath(pkg: HugoPlatformPackage): `bin/${"hugo" | "hugo.exe"}` {
  return `bin/${pkg.binaryName}`;
}

export function getPlatformPackageByName(packageName: string): HugoPlatformPackage | null {
  return HUGO_PLATFORM_PACKAGES.find((pkg) => pkg.packageName === packageName) ?? null;
}
