import crypto from "node:crypto";
import { afterEach, assert, describe, expect, it } from "vitest";
import { getArchiveType, parseChecksumFile } from "../../src/lib/install";
import { getReleaseFilename } from "../../src/lib/utils";

/**
 * Unit tests for installation logic that can be tested without network calls.
 * These tests verify:
 * - Checksum file parsing
 * - Archive type detection
 * - SHA-256 computation
 */
describe("Installation Logic", () => {
  describe("SHA-256 Computation", () => {
    it("should correctly compute SHA-256 hash", () => {
      const testData = "Hello, Hugo!";
      const hash = crypto.createHash("sha256");
      hash.update(Buffer.from(testData));
      const digest = hash.digest("hex");

      // Expected SHA-256 hash for "Hello, Hugo!"
      // Computed via: echo -n "Hello, Hugo!" | sha256sum
      // Cross-verified by computing with a second method below
      const expectedHash =
        "766a2e18bc3e2f7e217b4566b7988ca3a28e1de8cd70d995219088497a0830e5";

      expect(digest).toBe(expectedHash);
      expect(digest).toHaveLength(64);

      // Cross-verify by computing with a fresh hash instance
      const verifyHash = crypto.createHash("sha256");
      verifyHash.update(testData, "utf8");
      expect(verifyHash.digest("hex")).toBe(expectedHash);
    });
  });

  describe("parseChecksumFile", () => {
    it("should parse checksums file format correctly", () => {
      const checksumContent = `
abc123def456  hugo_0.154.3_linux-amd64.tar.gz
def789abc012  hugo_extended_0.154.3_linux-amd64.tar.gz
ghi345jkl678  hugo_0.154.3_windows-amd64.zip
`.trim();

      const checksums = parseChecksumFile(checksumContent);

      expect(checksums.size).toBe(3);
      expect(checksums.get("hugo_0.154.3_linux-amd64.tar.gz")).toBe(
        "abc123def456",
      );
      expect(checksums.get("hugo_extended_0.154.3_linux-amd64.tar.gz")).toBe(
        "def789abc012",
      );
      expect(checksums.get("hugo_0.154.3_windows-amd64.zip")).toBe(
        "ghi345jkl678",
      );
    });

    it("should find correct checksum for a given filename", () => {
      const checksumContent = `
abc123def456  hugo_0.154.3_linux-amd64.tar.gz
def789abc012  hugo_extended_0.154.3_linux-amd64.tar.gz
ghi345jkl678  hugo_0.154.3_windows-amd64.zip
`;
      const checksums = parseChecksumFile(checksumContent);

      expect(checksums.get("hugo_extended_0.154.3_linux-amd64.tar.gz")).toBe(
        "def789abc012",
      );
    });

    it("should return undefined when filename not in checksums", () => {
      const checksumContent = `
abc123def456  hugo_0.154.3_linux-amd64.tar.gz
`;
      const checksums = parseChecksumFile(checksumContent);

      expect(checksums.get("hugo_0.154.3_windows-amd64.zip")).toBeUndefined();
    });

    it("should handle empty content", () => {
      const checksums = parseChecksumFile("");
      expect(checksums.size).toBe(0);
    });

    it("should handle content with only whitespace lines", () => {
      const checksums = parseChecksumFile("   \n\n   \n");
      expect(checksums.size).toBe(0);
    });

    it("should handle real-world Hugo checksums format", () => {
      // Real format from Hugo releases uses two spaces between hash and filename
      const realChecksumContent = `
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  hugo_0.154.3_checksums.txt
a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890  hugo_extended_0.154.3_darwin-universal.pkg
f0e9d8c7b6a5432109876543210fedcba0987654321fedcba0987654321fedc  hugo_extended_0.154.3_linux-amd64.tar.gz
`;
      const checksums = parseChecksumFile(realChecksumContent);

      expect(checksums.size).toBe(3);
      expect(checksums.get("hugo_extended_0.154.3_darwin-universal.pkg")).toBe(
        "a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890",
      );
    });
  });

  describe("getArchiveType", () => {
    it("should identify zip files", () => {
      expect(getArchiveType("hugo_extended_0.154.3_windows-amd64.zip")).toBe(
        "zip",
      );
    });

    it("should identify tar.gz files", () => {
      expect(getArchiveType("hugo_extended_0.154.3_linux-amd64.tar.gz")).toBe(
        "tar.gz",
      );
    });

    it("should identify pkg files", () => {
      expect(getArchiveType("hugo_extended_0.154.3_darwin-universal.pkg")).toBe(
        "pkg",
      );
    });

    it("should return null for unknown extensions", () => {
      expect(getArchiveType("hugo_0.154.3_readme.txt")).toBeNull();
      expect(getArchiveType("hugo.exe")).toBeNull();
      expect(getArchiveType("checksums.txt")).toBeNull();
    });

    it("should correctly detect archive type for all platform release filenames", () => {
      // Windows x64 -> zip
      expect(getArchiveType("hugo_extended_0.154.3_windows-amd64.zip")).toBe(
        "zip",
      );

      // Windows arm64 -> zip
      expect(getArchiveType("hugo_0.154.3_windows-arm64.zip")).toBe("zip");

      // Linux x64 -> tar.gz
      expect(getArchiveType("hugo_extended_0.154.3_linux-amd64.tar.gz")).toBe(
        "tar.gz",
      );

      // Linux arm64 -> tar.gz
      expect(getArchiveType("hugo_extended_0.154.3_linux-arm64.tar.gz")).toBe(
        "tar.gz",
      );

      // macOS -> pkg
      expect(getArchiveType("hugo_extended_0.154.3_darwin-universal.pkg")).toBe(
        "pkg",
      );

      // FreeBSD -> tar.gz
      expect(getArchiveType("hugo_0.154.3_freebsd-amd64.tar.gz")).toBe(
        "tar.gz",
      );

      // OpenBSD -> tar.gz
      expect(getArchiveType("hugo_0.154.3_openbsd-amd64.tar.gz")).toBe(
        "tar.gz",
      );
    });
  });

  describe("getReleaseFilename + getArchiveType integration", () => {
    const originalPlatform = process.platform;
    const originalArch = process.arch;

    afterEach(() => {
      Object.defineProperty(process, "platform", { value: originalPlatform });
      Object.defineProperty(process, "arch", { value: originalArch });
    });

    it("should return zip for Windows release filenames", () => {
      Object.defineProperty(process, "platform", { value: "win32" });
      Object.defineProperty(process, "arch", { value: "x64" });

      const filename = getReleaseFilename("0.154.3");
      assert(filename !== null, "Expected Windows x64 to have a release file");
      expect(getArchiveType(filename)).toBe("zip");
    });

    it("should return tar.gz for Linux release filenames", () => {
      Object.defineProperty(process, "platform", { value: "linux" });
      Object.defineProperty(process, "arch", { value: "x64" });

      const filename = getReleaseFilename("0.154.3");
      assert(filename !== null, "Expected Linux x64 to have a release file");
      expect(getArchiveType(filename)).toBe("tar.gz");
    });

    it("should return pkg for macOS release filenames", () => {
      Object.defineProperty(process, "platform", { value: "darwin" });
      Object.defineProperty(process, "arch", { value: "arm64" });

      const filename = getReleaseFilename("0.154.3");
      assert(filename !== null, "Expected macOS arm64 to have a release file");
      expect(getArchiveType(filename)).toBe("pkg");
    });
  });
});
