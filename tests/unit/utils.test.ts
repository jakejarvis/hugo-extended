import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  compareVersions,
  getBinFilename,
  getBinPath,
  getChecksumFilename,
  getReleaseFilename,
  getReleaseUrl,
  isExtended,
  logger,
  usesMacOSPkg,
} from "../../src/lib/utils";

describe("utils", () => {
  describe("compareVersions", () => {
    it("should return 0 for equal versions", () => {
      expect(compareVersions("0.153.0", "0.153.0")).toBe(0);
      expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
    });

    it("should return -1 when first version is less", () => {
      expect(compareVersions("0.152.0", "0.153.0")).toBe(-1);
      expect(compareVersions("0.152.9", "0.153.0")).toBe(-1);
      expect(compareVersions("0.100.0", "0.153.0")).toBe(-1);
      expect(compareVersions("0.153.0", "1.0.0")).toBe(-1);
    });

    it("should return 1 when first version is greater", () => {
      expect(compareVersions("0.154.0", "0.153.0")).toBe(1);
      expect(compareVersions("0.153.1", "0.153.0")).toBe(1);
      expect(compareVersions("1.0.0", "0.153.0")).toBe(1);
    });

    it("should handle versions with different segment counts", () => {
      expect(compareVersions("0.153", "0.153.0")).toBe(0);
      expect(compareVersions("0.153.0.1", "0.153.0")).toBe(1);
    });
  });

  describe("usesMacOSPkg", () => {
    it("should return true for v0.153.0 and later", () => {
      expect(usesMacOSPkg("0.153.0")).toBe(true);
      expect(usesMacOSPkg("0.154.0")).toBe(true);
      expect(usesMacOSPkg("0.154.3")).toBe(true);
      expect(usesMacOSPkg("1.0.0")).toBe(true);
    });

    it("should return false for versions before v0.153.0", () => {
      expect(usesMacOSPkg("0.152.0")).toBe(false);
      expect(usesMacOSPkg("0.152.9")).toBe(false);
      expect(usesMacOSPkg("0.100.0")).toBe(false);
      expect(usesMacOSPkg("0.102.3")).toBe(false);
    });
  });

  describe("getBinFilename", () => {
    let originalPlatform: NodeJS.Platform;

    beforeEach(() => {
      originalPlatform = process.platform;
    });

    afterEach(() => {
      Object.defineProperty(process, "platform", { value: originalPlatform });
    });

    it("should return hugo.exe on Windows", () => {
      Object.defineProperty(process, "platform", { value: "win32" });
      expect(getBinFilename()).toBe("hugo.exe");
    });

    it("should return hugo on Linux", () => {
      Object.defineProperty(process, "platform", { value: "linux" });
      expect(getBinFilename()).toBe("hugo");
    });

    it("should return hugo on macOS", () => {
      Object.defineProperty(process, "platform", { value: "darwin" });
      expect(getBinFilename()).toBe("hugo");
    });

    it("should return hugo on other platforms", () => {
      Object.defineProperty(process, "platform", { value: "freebsd" });
      expect(getBinFilename()).toBe("hugo");
    });
  });

  describe("getReleaseFilename", () => {
    let originalPlatform: NodeJS.Platform;
    let originalArch: NodeJS.Architecture;

    beforeEach(() => {
      originalPlatform = process.platform;
      originalArch = process.arch;
    });

    afterEach(() => {
      Object.defineProperty(process, "platform", { value: originalPlatform });
      Object.defineProperty(process, "arch", { value: originalArch });
    });

    describe("macOS", () => {
      it("should return universal pkg for darwin x64 (v0.153.0+)", () => {
        Object.defineProperty(process, "platform", { value: "darwin" });
        Object.defineProperty(process, "arch", { value: "x64" });
        expect(getReleaseFilename("0.154.3")).toBe(
          "hugo_extended_0.154.3_darwin-universal.pkg",
        );
      });

      it("should return universal pkg for darwin arm64 (v0.153.0+)", () => {
        Object.defineProperty(process, "platform", { value: "darwin" });
        Object.defineProperty(process, "arch", { value: "arm64" });
        expect(getReleaseFilename("0.154.3")).toBe(
          "hugo_extended_0.154.3_darwin-universal.pkg",
        );
      });

      it("should return universal tar.gz for darwin x64 (pre-v0.153.0)", () => {
        Object.defineProperty(process, "platform", { value: "darwin" });
        Object.defineProperty(process, "arch", { value: "x64" });
        expect(getReleaseFilename("0.152.0")).toBe(
          "hugo_extended_0.152.0_darwin-universal.tar.gz",
        );
      });

      it("should return universal tar.gz for darwin arm64 (pre-v0.153.0)", () => {
        Object.defineProperty(process, "platform", { value: "darwin" });
        Object.defineProperty(process, "arch", { value: "arm64" });
        expect(getReleaseFilename("0.139.0")).toBe(
          "hugo_extended_0.139.0_darwin-universal.tar.gz",
        );
      });

      it("should return pkg at version boundary (v0.153.0)", () => {
        Object.defineProperty(process, "platform", { value: "darwin" });
        Object.defineProperty(process, "arch", { value: "arm64" });
        expect(getReleaseFilename("0.153.0")).toBe(
          "hugo_extended_0.153.0_darwin-universal.pkg",
        );
      });
    });

    describe("Windows", () => {
      it("should return extended zip for win32 x64", () => {
        Object.defineProperty(process, "platform", { value: "win32" });
        Object.defineProperty(process, "arch", { value: "x64" });
        expect(getReleaseFilename("0.154.3")).toBe(
          "hugo_extended_0.154.3_windows-amd64.zip",
        );
      });

      it("should return vanilla zip for win32 arm64 (no extended support)", () => {
        Object.defineProperty(process, "platform", { value: "win32" });
        Object.defineProperty(process, "arch", { value: "arm64" });
        expect(getReleaseFilename("0.154.3")).toBe(
          "hugo_0.154.3_windows-arm64.zip",
        );
      });
    });

    describe("Linux", () => {
      it("should return extended tar.gz for linux x64", () => {
        Object.defineProperty(process, "platform", { value: "linux" });
        Object.defineProperty(process, "arch", { value: "x64" });
        expect(getReleaseFilename("0.154.3")).toBe(
          "hugo_extended_0.154.3_linux-amd64.tar.gz",
        );
      });

      it("should return extended tar.gz for linux arm64", () => {
        Object.defineProperty(process, "platform", { value: "linux" });
        Object.defineProperty(process, "arch", { value: "arm64" });
        expect(getReleaseFilename("0.154.3")).toBe(
          "hugo_extended_0.154.3_linux-arm64.tar.gz",
        );
      });
    });

    describe("BSD", () => {
      it("should return vanilla tar.gz for freebsd x64", () => {
        Object.defineProperty(process, "platform", { value: "freebsd" });
        Object.defineProperty(process, "arch", { value: "x64" });
        expect(getReleaseFilename("0.154.3")).toBe(
          "hugo_0.154.3_freebsd-amd64.tar.gz",
        );
      });

      it("should return vanilla tar.gz for openbsd x64", () => {
        Object.defineProperty(process, "platform", { value: "openbsd" });
        Object.defineProperty(process, "arch", { value: "x64" });
        expect(getReleaseFilename("0.154.3")).toBe(
          "hugo_0.154.3_openbsd-amd64.tar.gz",
        );
      });
    });

    describe("unsupported platforms", () => {
      it("should return null for unsupported platform", () => {
        Object.defineProperty(process, "platform", { value: "sunos" });
        Object.defineProperty(process, "arch", { value: "x64" });
        expect(getReleaseFilename("0.154.3")).toBeNull();
      });

      it("should return null for unsupported arch on linux", () => {
        Object.defineProperty(process, "platform", { value: "linux" });
        Object.defineProperty(process, "arch", { value: "ia32" });
        expect(getReleaseFilename("0.154.3")).toBeNull();
      });

      it("should return null for unsupported arch on freebsd", () => {
        Object.defineProperty(process, "platform", { value: "freebsd" });
        Object.defineProperty(process, "arch", { value: "arm64" });
        expect(getReleaseFilename("0.154.3")).toBeNull();
      });
    });
  });

  describe("getChecksumFilename", () => {
    it("should return correct checksum filename", () => {
      expect(getChecksumFilename("0.154.3")).toBe("hugo_0.154.3_checksums.txt");
    });

    it("should handle different version formats", () => {
      expect(getChecksumFilename("1.0.0")).toBe("hugo_1.0.0_checksums.txt");
      expect(getChecksumFilename("0.100.0")).toBe("hugo_0.100.0_checksums.txt");
    });
  });

  describe("isExtended", () => {
    it("should return true for extended releases", () => {
      expect(isExtended("hugo_extended_0.154.3_linux-amd64.tar.gz")).toBe(true);
      expect(isExtended("hugo_extended_0.154.3_darwin-universal.pkg")).toBe(
        true,
      );
      expect(isExtended("hugo_extended_0.154.3_windows-amd64.zip")).toBe(true);
    });

    it("should return false for vanilla releases", () => {
      expect(isExtended("hugo_0.154.3_windows-arm64.zip")).toBe(false);
      expect(isExtended("hugo_0.154.3_freebsd-amd64.tar.gz")).toBe(false);
      expect(isExtended("hugo_0.154.3_openbsd-amd64.tar.gz")).toBe(false);
    });
  });

  describe("getReleaseUrl", () => {
    let originalMirrorBaseUrl: string | undefined;

    beforeEach(() => {
      originalMirrorBaseUrl = process.env.HUGO_MIRROR_BASE_URL;
      delete process.env.HUGO_MIRROR_BASE_URL;
    });

    afterEach(() => {
      if (originalMirrorBaseUrl === undefined) {
        delete process.env.HUGO_MIRROR_BASE_URL;
      } else {
        process.env.HUGO_MIRROR_BASE_URL = originalMirrorBaseUrl;
      }
    });

    it("should return correct GitHub release URL", () => {
      expect(
        getReleaseUrl("0.154.3", "hugo_extended_0.154.3_linux-amd64.tar.gz"),
      ).toBe(
        "https://github.com/gohugoio/hugo/releases/download/v0.154.3/hugo_extended_0.154.3_linux-amd64.tar.gz",
      );
    });

    it("should work with checksum files", () => {
      expect(getReleaseUrl("0.154.3", "hugo_0.154.3_checksums.txt")).toBe(
        "https://github.com/gohugoio/hugo/releases/download/v0.154.3/hugo_0.154.3_checksums.txt",
      );
    });

    it("should use custom base URL when HUGO_MIRROR_BASE_URL is set", () => {
      process.env.HUGO_MIRROR_BASE_URL = "https://mirror.example.com/hugo";
      expect(
        getReleaseUrl("0.154.3", "hugo_extended_0.154.3_linux-amd64.tar.gz"),
      ).toBe(
        "https://mirror.example.com/hugo/hugo_extended_0.154.3_linux-amd64.tar.gz",
      );
    });

    it("should strip trailing slash from custom base URL", () => {
      process.env.HUGO_MIRROR_BASE_URL = "https://mirror.example.com/hugo/";
      expect(
        getReleaseUrl("0.154.3", "hugo_extended_0.154.3_linux-amd64.tar.gz"),
      ).toBe(
        "https://mirror.example.com/hugo/hugo_extended_0.154.3_linux-amd64.tar.gz",
      );
    });
  });

  describe("getReleaseFilename with HUGO_NO_EXTENDED", () => {
    let originalPlatform: NodeJS.Platform;
    let originalArch: NodeJS.Architecture;
    let originalNoExtended: string | undefined;
    let originalForceStandard: string | undefined;

    beforeEach(() => {
      originalPlatform = process.platform;
      originalArch = process.arch;
      originalNoExtended = process.env.HUGO_NO_EXTENDED;
      originalForceStandard = process.env.HUGO_FORCE_STANDARD;
      delete process.env.HUGO_NO_EXTENDED;
      delete process.env.HUGO_FORCE_STANDARD;
    });

    afterEach(() => {
      Object.defineProperty(process, "platform", { value: originalPlatform });
      Object.defineProperty(process, "arch", { value: originalArch });
      if (originalNoExtended === undefined) {
        delete process.env.HUGO_NO_EXTENDED;
      } else {
        process.env.HUGO_NO_EXTENDED = originalNoExtended;
      }
      if (originalForceStandard === undefined) {
        delete process.env.HUGO_FORCE_STANDARD;
      } else {
        process.env.HUGO_FORCE_STANDARD = originalForceStandard;
      }
    });

    it("should return vanilla Hugo pkg when HUGO_NO_EXTENDED is set on macOS (v0.153.0+)", () => {
      Object.defineProperty(process, "platform", { value: "darwin" });
      Object.defineProperty(process, "arch", { value: "arm64" });
      process.env.HUGO_NO_EXTENDED = "1";
      expect(getReleaseFilename("0.154.3")).toBe(
        "hugo_0.154.3_darwin-universal.pkg",
      );
    });

    it("should return vanilla Hugo tar.gz when HUGO_NO_EXTENDED is set on macOS (pre-v0.153.0)", () => {
      Object.defineProperty(process, "platform", { value: "darwin" });
      Object.defineProperty(process, "arch", { value: "arm64" });
      process.env.HUGO_NO_EXTENDED = "1";
      expect(getReleaseFilename("0.152.0")).toBe(
        "hugo_0.152.0_darwin-universal.tar.gz",
      );
    });

    it("should return vanilla Hugo when HUGO_NO_EXTENDED is set on Linux", () => {
      Object.defineProperty(process, "platform", { value: "linux" });
      Object.defineProperty(process, "arch", { value: "x64" });
      process.env.HUGO_NO_EXTENDED = "1";
      expect(getReleaseFilename("0.154.3")).toBe(
        "hugo_0.154.3_linux-amd64.tar.gz",
      );
    });

    it("should return vanilla Hugo when HUGO_NO_EXTENDED is set on Windows", () => {
      Object.defineProperty(process, "platform", { value: "win32" });
      Object.defineProperty(process, "arch", { value: "x64" });
      process.env.HUGO_NO_EXTENDED = "1";
      expect(getReleaseFilename("0.154.3")).toBe(
        "hugo_0.154.3_windows-amd64.zip",
      );
    });

    it("should work with HUGO_FORCE_STANDARD alias", () => {
      Object.defineProperty(process, "platform", { value: "linux" });
      Object.defineProperty(process, "arch", { value: "arm64" });
      process.env.HUGO_FORCE_STANDARD = "true";
      expect(getReleaseFilename("0.154.3")).toBe(
        "hugo_0.154.3_linux-arm64.tar.gz",
      );
    });
  });

  describe("getBinPath with HUGO_BIN_PATH", () => {
    let originalBinPath: string | undefined;

    beforeEach(() => {
      originalBinPath = process.env.HUGO_BIN_PATH;
      delete process.env.HUGO_BIN_PATH;
    });

    afterEach(() => {
      if (originalBinPath === undefined) {
        delete process.env.HUGO_BIN_PATH;
      } else {
        process.env.HUGO_BIN_PATH = originalBinPath;
      }
    });

    it("should return custom path when HUGO_BIN_PATH is set", () => {
      process.env.HUGO_BIN_PATH = "/custom/path/to/hugo";
      expect(getBinPath()).toBe("/custom/path/to/hugo");
    });

    it("should return default path when HUGO_BIN_PATH is not set", () => {
      const binPath = getBinPath();
      expect(binPath).toContain("bin");
      expect(binPath).toMatch(/hugo(\.exe)?$/);
    });
  });

  describe("logger", () => {
    let originalQuiet: string | undefined;
    let originalSilent: string | undefined;

    beforeEach(() => {
      originalQuiet = process.env.HUGO_QUIET;
      originalSilent = process.env.HUGO_SILENT;
      delete process.env.HUGO_QUIET;
      delete process.env.HUGO_SILENT;
      vi.spyOn(console, "info").mockImplementation(() => {});
      vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      if (originalQuiet === undefined) {
        delete process.env.HUGO_QUIET;
      } else {
        process.env.HUGO_QUIET = originalQuiet;
      }
      if (originalSilent === undefined) {
        delete process.env.HUGO_SILENT;
      } else {
        process.env.HUGO_SILENT = originalSilent;
      }
      vi.restoreAllMocks();
    });

    describe("info", () => {
      it("should log when not quiet", () => {
        logger.info("test message");
        expect(console.info).toHaveBeenCalledWith("test message");
      });

      it("should not log when HUGO_QUIET is set", () => {
        process.env.HUGO_QUIET = "1";
        logger.info("test message");
        expect(console.info).not.toHaveBeenCalled();
      });
    });

    describe("warn", () => {
      it("should log when not quiet", () => {
        logger.warn("warning message");
        expect(console.warn).toHaveBeenCalledWith("⚠ warning message");
      });

      it("should not log when HUGO_SILENT is set", () => {
        process.env.HUGO_SILENT = "1";
        logger.warn("warning message");
        expect(console.warn).not.toHaveBeenCalled();
      });
    });

    describe("error", () => {
      it("should always log errors", () => {
        logger.error("error message");
        expect(console.error).toHaveBeenCalledWith("✖ error message");
      });

      it("should log errors even when quiet", () => {
        process.env.HUGO_QUIET = "1";
        logger.error("error message");
        expect(console.error).toHaveBeenCalledWith("✖ error message");
      });
    });
  });
});
