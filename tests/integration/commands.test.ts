import { beforeAll, describe, expect, it } from "vitest";
import hugo, { execWithOutput } from "../../src/hugo";

describe("Hugo Commands Integration", () => {
  beforeAll(async () => {
    // Ensure Hugo is installed
    const bin = await hugo();
    expect(bin).toBeTruthy();
  });

  describe("version command", () => {
    it("should return Hugo version", async () => {
      const { stdout } = await execWithOutput("version");
      expect(stdout).toContain("hugo v");
      expect(stdout).toContain("extended");
    });
  });

  describe("env command", () => {
    it("should return environment info", async () => {
      const { stdout } = await execWithOutput("env");
      expect(stdout).toContain("GOOS");
      expect(stdout).toContain("GOARCH");
    });
  });

  describe("config command", () => {
    it("should handle missing config gracefully", async () => {
      // This will fail but should not throw unhandled errors
      try {
        await execWithOutput("config");
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect((err as Error).message).toContain("exit code");
      }
    });
  });
});
