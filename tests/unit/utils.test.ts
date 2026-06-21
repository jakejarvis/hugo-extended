import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getPlatformPackage } from "../../src/lib/platform";
import {
  compareVersions,
  getBinFilename,
  getBinPath,
  getChecksumFilename,
  getPkgVersion,
  getPlatformPackageBinaryPath,
  getReleaseFilename,
  getReleaseUrl,
  isExtended,
  logger,
} from "../../src/lib/utils";

describe("utils", () => {
  describe("compareVersions", () => {
    it("returns 0 for equal versions", () => {
      expect(compareVersions("0.153.0", "0.153.0")).toBe(0);
      expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
    });

    it("returns -1 when the first version is less", () => {
      expect(compareVersions("0.152.0", "0.153.0")).toBe(-1);
      expect(compareVersions("0.153.0", "1.0.0")).toBe(-1);
    });

    it("returns 1 when the first version is greater", () => {
      expect(compareVersions("0.154.0", "0.153.0")).toBe(1);
      expect(compareVersions("1.0.0", "0.153.0")).toBe(1);
    });

    it("handles versions with different segment counts", () => {
      expect(compareVersions("0.153", "0.153.0")).toBe(0);
      expect(compareVersions("0.153.0.1", "0.153.0")).toBe(1);
    });
  });

  describe("getPkgVersion", () => {
    it("returns the package version", () => {
      expect(getPkgVersion()).toMatch(/^\d+\.\d+\.\d+/);
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

    it("returns hugo.exe on Windows", () => {
      Object.defineProperty(process, "platform", { value: "win32" });
      expect(getBinFilename()).toBe("hugo.exe");
    });

    it("returns hugo on Unix-like platforms", () => {
      Object.defineProperty(process, "platform", { value: "linux" });
      expect(getBinFilename()).toBe("hugo");
    });
  });

  describe("platform packages", () => {
    it("maps macOS x64 and ARM64 to the universal Extended package", () => {
      expect(getPlatformPackage("darwin", "x64")).toMatchObject({
        packageName: "@jakejarvis/hugo-extended-darwin-universal",
        binaryName: "hugo",
        extended: true,
      });
      expect(getPlatformPackage("darwin", "arm64")).toMatchObject({
        packageName: "@jakejarvis/hugo-extended-darwin-universal",
      });
    });

    it("maps Linux x64 and ARM64 to Extended packages", () => {
      expect(getPlatformPackage("linux", "x64")).toMatchObject({
        packageName: "@jakejarvis/hugo-extended-linux-amd64",
        binaryName: "hugo",
        extended: true,
      });
      expect(getPlatformPackage("linux", "arm64")).toMatchObject({
        packageName: "@jakejarvis/hugo-extended-linux-arm64",
      });
    });

    it("maps Windows x64 to Extended and Windows ARM64 to vanilla", () => {
      expect(getPlatformPackage("win32", "x64")).toMatchObject({
        packageName: "@jakejarvis/hugo-extended-windows-amd64",
        binaryName: "hugo.exe",
        extended: true,
      });
      expect(getPlatformPackage("win32", "arm64")).toMatchObject({
        packageName: "@jakejarvis/hugo-windows-arm64",
        binaryName: "hugo.exe",
        extended: false,
      });
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

    it("returns the release filename for the current supported platform", () => {
      Object.defineProperty(process, "platform", { value: "linux" });
      Object.defineProperty(process, "arch", { value: "x64" });

      expect(getReleaseFilename("0.163.3")).toBe("hugo_extended_0.163.3_linux-amd64.tar.gz");
    });

    it("returns null for unsupported platforms", () => {
      Object.defineProperty(process, "platform", { value: "freebsd" });
      Object.defineProperty(process, "arch", { value: "x64" });

      expect(getReleaseFilename("0.163.3")).toBeNull();
    });
  });

  describe("getReleaseUrl", () => {
    it("returns the GitHub release URL", () => {
      expect(getReleaseUrl("0.163.3", "hugo_extended_0.163.3_linux-amd64.tar.gz")).toBe(
        "https://github.com/gohugoio/hugo/releases/download/v0.163.3/hugo_extended_0.163.3_linux-amd64.tar.gz",
      );
    });
  });

  describe("getChecksumFilename", () => {
    it("returns the checksums filename", () => {
      expect(getChecksumFilename("0.163.3")).toBe("hugo_0.163.3_checksums.txt");
    });
  });

  describe("isExtended", () => {
    it("identifies Extended release filenames", () => {
      expect(isExtended("hugo_extended_0.163.3_linux-amd64.tar.gz")).toBe(true);
      expect(isExtended("hugo_0.163.3_windows-arm64.zip")).toBe(false);
    });
  });

  describe("getPlatformPackageBinaryPath", () => {
    it("resolves a package binary subpath", () => {
      const pkg = getPlatformPackage("linux", "x64");
      if (!pkg) throw new Error("Expected Linux x64 package");

      const resolved = getPlatformPackageBinaryPath(pkg, (specifier) => {
        expect(specifier).toBe("@jakejarvis/hugo-extended-linux-amd64/bin/hugo");
        return "/node_modules/@jakejarvis/hugo-extended-linux-amd64/bin/hugo";
      });

      expect(resolved).toBe("/node_modules/@jakejarvis/hugo-extended-linux-amd64/bin/hugo");
    });

    it("returns null when the optional package is missing", () => {
      const pkg = getPlatformPackage("linux", "x64");
      if (!pkg) throw new Error("Expected Linux x64 package");

      const resolved = getPlatformPackageBinaryPath(pkg, () => {
        const error = new Error("missing") as NodeJS.ErrnoException;
        error.code = "MODULE_NOT_FOUND";
        throw error;
      });

      expect(resolved).toBeNull();
    });
  });

  describe("getBinPath", () => {
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

    it("returns HUGO_BIN_PATH when set", () => {
      process.env.HUGO_BIN_PATH = "/custom/path/to/hugo";

      expect(getBinPath()).toBe("/custom/path/to/hugo");
    });
  });

  describe("logger", () => {
    beforeEach(() => {
      vi.spyOn(console, "info").mockImplementation(() => {});
      vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("logs info messages", () => {
      logger.info("test message");
      expect(console.info).toHaveBeenCalledWith("test message");
    });

    it("logs warning messages", () => {
      logger.warn("warning message");
      expect(console.warn).toHaveBeenCalledWith("⚠ warning message");
    });

    it("logs error messages", () => {
      logger.error("error message");
      expect(console.error).toHaveBeenCalledWith("✖ error message");
    });
  });
});
