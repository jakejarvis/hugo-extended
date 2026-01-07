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
    it("should return default config when no config file exists", async () => {
      // As of Hugo v0.154.x, the config command returns default configuration
      // even when no config file exists, rather than throwing an error
      const { stdout } = await execWithOutput("config");
      expect(stdout).toContain("contentdir");
      expect(stdout).toContain("publishdir");
      expect(stdout).toContain("defaultcontentlanguage");
    });
  });
});
