import { describe, expect, it } from "vitest";

import {
  createBinaryPackageJson,
  getArchiveType,
  getBinaryPackageBinPath,
  getBinaryPackageDir,
  parseChecksumFile,
} from "../../scripts/generate-binary-packages";
import { getPlatformPackageByName, HUGO_PLATFORM_PACKAGES } from "../../src/lib/platform";

describe("binary package generation", () => {
  describe("package set", () => {
    it("contains the supported platform packages", () => {
      expect(HUGO_PLATFORM_PACKAGES.map((pkg) => pkg.packageName)).toEqual([
        "@jakejarvis/hugo-extended-darwin-universal",
        "@jakejarvis/hugo-extended-linux-amd64",
        "@jakejarvis/hugo-extended-linux-arm64",
        "@jakejarvis/hugo-extended-windows-amd64",
        "@jakejarvis/hugo-windows-arm64",
      ]);
    });
  });

  describe("createBinaryPackageJson", () => {
    it("creates a script-free manifest with platform filters", () => {
      const pkg = getPlatformPackageByName("@jakejarvis/hugo-extended-linux-amd64");
      if (!pkg) throw new Error("Expected Linux x64 package");

      const manifest = createBinaryPackageJson(pkg, "0.163.3");

      expect(manifest).toMatchObject({
        name: "@jakejarvis/hugo-extended-linux-amd64",
        version: "0.163.3",
        os: ["linux"],
        cpu: ["x64"],
        preferUnplugged: true,
        publishConfig: { access: "public" },
        files: ["bin", "README.md", "LICENSE"],
      });
      expect(manifest).not.toHaveProperty("scripts");
      expect(manifest).not.toHaveProperty("bin");
    });

    it("uses vanilla Hugo naming for Windows ARM64", () => {
      const pkg = getPlatformPackageByName("@jakejarvis/hugo-windows-arm64");
      if (!pkg) throw new Error("Expected Windows ARM64 package");

      const manifest = createBinaryPackageJson(pkg, "0.163.3");

      expect(manifest.name).toBe("@jakejarvis/hugo-windows-arm64");
      expect(manifest.description).toContain("Hugo binary");
      expect(pkg?.releaseFilename("0.163.3")).toBe("hugo_0.163.3_windows-arm64.zip");
    });
  });

  describe("paths", () => {
    it("uses package directory names and binary filenames", () => {
      const pkg = getPlatformPackageByName("@jakejarvis/hugo-extended-windows-amd64");
      if (!pkg) throw new Error("Expected Windows x64 package");

      expect(getBinaryPackageDir(pkg, "/tmp/out")).toBe("/tmp/out/hugo-extended-windows-amd64");
      expect(getBinaryPackageBinPath(pkg, "/tmp/out")).toBe(
        "/tmp/out/hugo-extended-windows-amd64/bin/hugo.exe",
      );
    });
  });

  describe("parseChecksumFile", () => {
    it("parses checksums file format correctly", () => {
      const checksumContent = `
abc123def456  hugo_0.163.3_linux-amd64.tar.gz
def789abc012  hugo_extended_0.163.3_linux-amd64.tar.gz
ghi345jkl678  hugo_0.163.3_windows-amd64.zip
`.trim();

      const checksums = parseChecksumFile(checksumContent);

      expect(checksums.size).toBe(3);
      expect(checksums.get("hugo_0.163.3_linux-amd64.tar.gz")).toBe("abc123def456");
      expect(checksums.get("hugo_extended_0.163.3_linux-amd64.tar.gz")).toBe("def789abc012");
      expect(checksums.get("hugo_0.163.3_windows-amd64.zip")).toBe("ghi345jkl678");
    });

    it("handles empty content", () => {
      expect(parseChecksumFile("").size).toBe(0);
      expect(parseChecksumFile("   \n\n   \n").size).toBe(0);
    });
  });

  describe("getArchiveType", () => {
    it("detects supported archive types", () => {
      expect(getArchiveType("hugo_extended_0.163.3_windows-amd64.zip")).toBe("zip");
      expect(getArchiveType("hugo_extended_0.163.3_linux-amd64.tar.gz")).toBe("tar.gz");
      expect(getArchiveType("hugo_extended_0.163.3_darwin-universal.pkg")).toBe("pkg");
    });

    it("returns null for unknown extensions", () => {
      expect(getArchiveType("hugo_0.163.3_checksums.txt")).toBeNull();
      expect(getArchiveType("hugo")).toBeNull();
    });
  });
});
