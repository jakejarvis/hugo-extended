import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ENV_VAR_DOCS, getEnvConfig } from "../../src/lib/env";

describe("env", () => {
  // Store original env vars to restore after each test
  const originalEnv: Record<string, string | undefined> = {};

  // List of all env vars we might set during tests
  const envVars = [
    "HUGO_OVERRIDE_VERSION",
    "HUGO_NO_EXTENDED",
    "HUGO_FORCE_STANDARD",
    "HUGO_SKIP_DOWNLOAD",
    "HUGO_BIN_PATH",
    "HUGO_MIRROR_BASE_URL",
    "HUGO_SKIP_CHECKSUM",
    "HUGO_SKIP_VERIFY",
    "HUGO_QUIET",
    "HUGO_SILENT",
  ];

  beforeEach(() => {
    // Save original values
    for (const key of envVars) {
      originalEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    // Restore original values
    for (const key of envVars) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    }
  });

  describe("getEnvConfig", () => {
    describe("overrideVersion", () => {
      it("should return undefined when not set", () => {
        const config = getEnvConfig();
        expect(config.overrideVersion).toBeUndefined();
      });

      it("should return the value from HUGO_OVERRIDE_VERSION", () => {
        process.env.HUGO_OVERRIDE_VERSION = "0.139.0";
        const config = getEnvConfig();
        expect(config.overrideVersion).toBe("0.139.0");
      });

      it("should strip v prefix from version", () => {
        process.env.HUGO_OVERRIDE_VERSION = "v0.139.0";
        const config = getEnvConfig();
        expect(config.overrideVersion).toBe("0.139.0");
      });

      it("should return undefined for empty string", () => {
        process.env.HUGO_OVERRIDE_VERSION = "";
        const config = getEnvConfig();
        expect(config.overrideVersion).toBeUndefined();
      });

      it("should return undefined for whitespace-only string", () => {
        process.env.HUGO_OVERRIDE_VERSION = "   ";
        const config = getEnvConfig();
        expect(config.overrideVersion).toBeUndefined();
      });
    });

    describe("forceStandard", () => {
      it("should return false when not set", () => {
        const config = getEnvConfig();
        expect(config.forceStandard).toBe(false);
      });

      it.each([
        "1",
        "true",
        "yes",
        "on",
        "TRUE",
        "True",
        "YES",
        "ON",
      ])('should return true for "%s"', (value) => {
        process.env.HUGO_NO_EXTENDED = value;
        const config = getEnvConfig();
        expect(config.forceStandard).toBe(true);
      });

      it.each([
        "0",
        "false",
        "no",
        "off",
        "",
        "invalid",
      ])('should return false for "%s"', (value) => {
        process.env.HUGO_NO_EXTENDED = value;
        const config = getEnvConfig();
        expect(config.forceStandard).toBe(false);
      });

      it("should work with HUGO_FORCE_STANDARD alias", () => {
        process.env.HUGO_FORCE_STANDARD = "1";
        const config = getEnvConfig();
        expect(config.forceStandard).toBe(true);
      });
    });

    describe("skipInstall", () => {
      it("should return false when not set", () => {
        const config = getEnvConfig();
        expect(config.skipInstall).toBe(false);
      });

      it("should return true when HUGO_SKIP_DOWNLOAD is truthy", () => {
        process.env.HUGO_SKIP_DOWNLOAD = "1";
        const config = getEnvConfig();
        expect(config.skipInstall).toBe(true);
      });

      it("should work with HUGO_SKIP_DOWNLOAD alias", () => {
        process.env.HUGO_SKIP_DOWNLOAD = "true";
        const config = getEnvConfig();
        expect(config.skipInstall).toBe(true);
      });
    });

    describe("binPath", () => {
      it("should return undefined when not set", () => {
        const config = getEnvConfig();
        expect(config.binPath).toBeUndefined();
      });

      it("should return the value from HUGO_BIN_PATH", () => {
        process.env.HUGO_BIN_PATH = "/usr/local/bin/hugo";
        const config = getEnvConfig();
        expect(config.binPath).toBe("/usr/local/bin/hugo");
      });

      it("should trim whitespace", () => {
        process.env.HUGO_BIN_PATH = "  /usr/local/bin/hugo  ";
        const config = getEnvConfig();
        expect(config.binPath).toBe("/usr/local/bin/hugo");
      });
    });

    describe("downloadBaseUrl", () => {
      it("should return undefined when not set", () => {
        const config = getEnvConfig();
        expect(config.downloadBaseUrl).toBeUndefined();
      });

      it("should return the value from HUGO_MIRROR_BASE_URL", () => {
        process.env.HUGO_MIRROR_BASE_URL = "https://mirror.example.com/hugo";
        const config = getEnvConfig();
        expect(config.downloadBaseUrl).toBe("https://mirror.example.com/hugo");
      });
    });

    describe("skipChecksum", () => {
      it("should return false when not set", () => {
        const config = getEnvConfig();
        expect(config.skipChecksum).toBe(false);
      });

      it("should return true when HUGO_SKIP_CHECKSUM is truthy", () => {
        process.env.HUGO_SKIP_CHECKSUM = "1";
        const config = getEnvConfig();
        expect(config.skipChecksum).toBe(true);
      });

      it("should work with HUGO_SKIP_VERIFY alias", () => {
        process.env.HUGO_SKIP_VERIFY = "true";
        const config = getEnvConfig();
        expect(config.skipChecksum).toBe(true);
      });
    });

    describe("quiet", () => {
      it("should return false when not set", () => {
        const config = getEnvConfig();
        expect(config.quiet).toBe(false);
      });

      it("should return true when HUGO_QUIET is truthy", () => {
        process.env.HUGO_QUIET = "1";
        const config = getEnvConfig();
        expect(config.quiet).toBe(true);
      });

      it("should work with HUGO_SILENT alias", () => {
        process.env.HUGO_SILENT = "true";
        const config = getEnvConfig();
        expect(config.quiet).toBe(true);
      });
    });
  });

  describe("ENV_VAR_DOCS", () => {
    it("should export documentation for all env vars", () => {
      expect(ENV_VAR_DOCS).toBeDefined();
      expect(Array.isArray(ENV_VAR_DOCS)).toBe(true);
      expect(ENV_VAR_DOCS.length).toBeGreaterThan(0);
    });

    it("should have required fields for each entry", () => {
      for (const doc of ENV_VAR_DOCS) {
        expect(doc.key).toBeDefined();
        expect(doc.name).toBeDefined();
        expect(doc.name).toMatch(/^HUGO_/);
        expect(doc.description).toBeDefined();
        expect(Array.isArray(doc.aliases)).toBe(true);
        expect(["string", "boolean"]).toContain(doc.type);
      }
    });

    it("should document all expected env vars", () => {
      const expectedKeys = [
        "overrideVersion",
        "forceStandard",
        "skipInstall",
        "binPath",
        "downloadBaseUrl",
        "skipChecksum",
        "quiet",
      ];

      const actualKeys = ENV_VAR_DOCS.map((doc) => doc.key);
      for (const key of expectedKeys) {
        expect(actualKeys).toContain(key);
      }
    });
  });
});
