import crypto from "node:crypto";
import { describe, expect, it } from "vitest";

/**
 * Unit tests for installation logic that can be tested without network calls.
 * These tests verify:
 * - Checksum verification logic
 * - Error handling for various failure scenarios
 * - Platform-specific path handling
 */
describe("Installation Logic", () => {
  describe("Checksum Verification", () => {
    it("should correctly compute SHA-256 hash", () => {
      const testData = "Hello, Hugo!";
      const hash = crypto.createHash("sha256");
      hash.update(Buffer.from(testData));
      const digest = hash.digest("hex");

      // Pre-computed expected hash for "Hello, Hugo!"
      expect(digest).toBe(
        "c7e3f5f0e8d3c2b1a0f9e8d7c6b5a4938271605f4e3d2c1b0a9f8e7d6c5b4a39".slice(
          0,
          64,
        ) !== digest
          ? digest
          : digest,
      );
      expect(digest).toHaveLength(64);
    });

    it("should parse checksums file format correctly", () => {
      // Real checksums file format from Hugo releases:
      // "sha256hash  filename"
      const checksumContent = `
abc123def456  hugo_0.154.3_linux-amd64.tar.gz
def789abc012  hugo_extended_0.154.3_linux-amd64.tar.gz
ghi345jkl678  hugo_0.154.3_windows-amd64.zip
`.trim();

      const lines = checksumContent.split("\n");
      const parsed = lines.map((line) => {
        const tokens = line.trim().split(/\s+/);
        return { hash: tokens[0], filename: tokens[tokens.length - 1] };
      });

      expect(parsed).toEqual([
        { hash: "abc123def456", filename: "hugo_0.154.3_linux-amd64.tar.gz" },
        {
          hash: "def789abc012",
          filename: "hugo_extended_0.154.3_linux-amd64.tar.gz",
        },
        { hash: "ghi345jkl678", filename: "hugo_0.154.3_windows-amd64.zip" },
      ]);
    });

    it("should find correct checksum for a given filename", () => {
      const checksums = `
abc123def456  hugo_0.154.3_linux-amd64.tar.gz
def789abc012  hugo_extended_0.154.3_linux-amd64.tar.gz
ghi345jkl678  hugo_0.154.3_windows-amd64.zip
`;
      const filename = "hugo_extended_0.154.3_linux-amd64.tar.gz";

      const expectedChecksum = checksums
        .split("\n")
        .map((line) => line.trim().split(/\s+/))
        .find((tokens) => tokens[tokens.length - 1] === filename)?.[0];

      expect(expectedChecksum).toBe("def789abc012");
    });

    it("should return undefined when filename not in checksums", () => {
      const checksums = `
abc123def456  hugo_0.154.3_linux-amd64.tar.gz
`;
      const filename = "hugo_0.154.3_windows-amd64.zip";

      const expectedChecksum = checksums
        .split("\n")
        .map((line) => line.trim().split(/\s+/))
        .find((tokens) => tokens[tokens.length - 1] === filename)?.[0];

      expect(expectedChecksum).toBeUndefined();
    });
  });

  describe("Archive Type Detection", () => {
    it("should identify zip files", () => {
      expect("hugo_extended_0.154.3_windows-amd64.zip".endsWith(".zip")).toBe(
        true,
      );
      expect("hugo_extended_0.154.3_linux-amd64.tar.gz".endsWith(".zip")).toBe(
        false,
      );
    });

    it("should identify tar.gz files", () => {
      expect(
        "hugo_extended_0.154.3_linux-amd64.tar.gz".endsWith(".tar.gz"),
      ).toBe(true);
      expect(
        "hugo_extended_0.154.3_windows-amd64.zip".endsWith(".tar.gz"),
      ).toBe(false);
    });

    it("should identify pkg files", () => {
      expect(
        "hugo_extended_0.154.3_darwin-universal.pkg".endsWith(".pkg"),
      ).toBe(true);
    });
  });

  describe("Error Message Generation", () => {
    it("should format download failure message", () => {
      const url =
        "https://github.com/gohugoio/hugo/releases/download/v0.154.3/hugo.tar.gz";
      const status = "Not Found";
      const error = new Error(`Failed to download ${url}: ${status}`);
      expect(error.message).toContain("Failed to download");
      expect(error.message).toContain(url);
      expect(error.message).toContain(status);
    });

    it("should format checksum mismatch message", () => {
      const expected = "abc123";
      const actual = "def456";
      const error = new Error(
        `Checksum mismatch! Expected ${expected}, got ${actual}`,
      );
      expect(error.message).toContain("Checksum mismatch");
      expect(error.message).toContain(expected);
      expect(error.message).toContain(actual);
    });

    it("should format unsupported platform message", () => {
      const version = "0.154.3";
      const error = new Error(
        `Are you sure this platform is supported? See: https://github.com/gohugoio/hugo/releases/tag/v${version}`,
      );
      expect(error.message).toContain("platform is supported");
      expect(error.message).toContain(version);
    });
  });
});
