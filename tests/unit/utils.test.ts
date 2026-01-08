import { afterEach, describe, expect, it } from "vitest";
import {
  getBinFilename,
  getChecksumFilename,
  getReleaseFilename,
  getReleaseUrl,
  isExtended,
} from "../../src/lib/utils";

describe("utils", () => {
  describe("getBinFilename", () => {
    const originalPlatform = process.platform;

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
    const originalPlatform = process.platform;
    const originalArch = process.arch;

    afterEach(() => {
      Object.defineProperty(process, "platform", { value: originalPlatform });
      Object.defineProperty(process, "arch", { value: originalArch });
    });

    describe("macOS", () => {
      it("should return universal pkg for darwin x64", () => {
        Object.defineProperty(process, "platform", { value: "darwin" });
        Object.defineProperty(process, "arch", { value: "x64" });
        expect(getReleaseFilename("0.154.3")).toBe(
          "hugo_extended_0.154.3_darwin-universal.pkg",
        );
      });

      it("should return universal pkg for darwin arm64", () => {
        Object.defineProperty(process, "platform", { value: "darwin" });
        Object.defineProperty(process, "arch", { value: "arm64" });
        expect(getReleaseFilename("0.154.3")).toBe(
          "hugo_extended_0.154.3_darwin-universal.pkg",
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
  });
});
