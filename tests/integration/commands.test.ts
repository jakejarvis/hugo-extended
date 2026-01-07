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
    it("should throw an error when config is missing", async () => {
      // Hugo config command requires a valid Hugo site with a config file
      await expect(execWithOutput("config")).rejects.toThrow(
        /Hugo command failed with exit code/,
      );
    });
  });
});
