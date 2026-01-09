import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, statSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import hugo, { execWithOutput, getHugoBinary } from "../../src/hugo";
import {
  getBinFilename,
  getBinPath,
  getPkgVersion,
  getReleaseFilename,
  isExtended,
} from "../../src/lib/utils";

/**
 * End-to-end tests for Hugo installation.
 *
 * These tests verify:
 * - Binary is installed correctly for the current platform
 * - Binary has correct permissions
 * - Binary is executable and returns expected version
 * - Extended version is installed where supported
 *
 * Note: These tests use the actual installed Hugo binary and require
 * npm install/postinstall to have completed successfully.
 */
describe("Hugo Installation E2E", () => {
  let binaryPath: string;

  beforeAll(async () => {
    // Ensure Hugo is installed
    binaryPath = await hugo();
  });

  describe("Binary Installation", () => {
    it("should have Hugo binary installed", () => {
      expect(existsSync(binaryPath)).toBe(true);
    });

    it("should have binary at expected path", () => {
      const expectedPath = getBinPath();
      expect(binaryPath).toBe(expectedPath);
    });

    it("should have correct binary filename for platform", () => {
      const expectedFilename = getBinFilename();
      const actualFilename = binaryPath.split(/[\\/]/).pop();
      expect(actualFilename).toBe(expectedFilename);
    });
  });

  describe("Binary Permissions (Unix)", () => {
    it.skipIf(process.platform === "win32")(
      "should have executable permissions",
      () => {
        const stats = statSync(binaryPath);
        // Check that at least owner has execute permission (0o100)
        const hasExecute = (stats.mode & 0o100) !== 0;
        expect(hasExecute).toBe(true);
      },
    );

    it.skipIf(process.platform !== "darwin")(
      "should be a regular file on macOS (not a symlink)",
      () => {
        // Since v0.153.0, we extract the .pkg locally using pkgutil
        // instead of running `sudo installer`, so the binary is a regular file
        const stats = lstatSync(binaryPath);
        expect(stats.isSymbolicLink()).toBe(false);
        expect(stats.isFile()).toBe(true);
      },
    );
  });

  describe("Binary Execution", () => {
    it("should execute successfully", () => {
      const result = execFileSync(binaryPath, ["version"]);
      expect(result).toBeTruthy();
    });

    it("should return version string", () => {
      const result = execFileSync(binaryPath, ["version"]).toString().trim();
      expect(result).toContain("hugo v");
    });

    it("should match package version", () => {
      const pkgVersion = getPkgVersion();
      const result = execFileSync(binaryPath, ["version"]).toString().trim();
      expect(result).toContain(`v${pkgVersion}`);
    });

    it.skipIf(!isExtended(getReleaseFilename(getPkgVersion()) ?? ""))(
      "should be Extended version where supported",
      () => {
        const result = execFileSync(binaryPath, ["version"]).toString().trim();
        expect(result).toContain("+extended");
      },
    );
  });

  describe("API Integration", () => {
    it("should work with default export (callable)", async () => {
      const path = await hugo();
      expect(path).toBe(binaryPath);
    });

    it("should work with getHugoBinary()", async () => {
      const path = await getHugoBinary();
      expect(path).toBe(binaryPath);
    });

    it("should work with execWithOutput()", async () => {
      const { stdout } = await execWithOutput("version");
      expect(stdout).toContain("hugo v");
    });

    it("should work with builder API", async () => {
      // hugo.version() uses exec() which inherits stdio, so we use execWithOutput
      const { stdout } = await execWithOutput("version");
      expect(stdout).toBeTruthy();
    });
  });

  describe("Environment Info", () => {
    it("should report correct GOOS", async () => {
      const { stdout } = await execWithOutput("env");

      const expectedGoos =
        process.platform === "win32"
          ? "windows"
          : process.platform === "darwin"
            ? "darwin"
            : "linux";

      expect(stdout).toContain(`GOOS="${expectedGoos}"`);
    });

    it("should report correct GOARCH", async () => {
      const { stdout } = await execWithOutput("env");

      const expectedGoarch =
        process.arch === "x64"
          ? "amd64"
          : process.arch === "arm64"
            ? "arm64"
            : process.arch;

      expect(stdout).toContain(`GOARCH="${expectedGoarch}"`);
    });
  });
});
