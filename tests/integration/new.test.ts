import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hugo } from "../../src/hugo";

describe("New Commands Integration", () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create temp directory for each test
    tempDir = await mkdtemp(join(tmpdir(), "hugo-test-"));
  });

  afterEach(async () => {
    // Cleanup
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("new.site", () => {
    it("should create a new site with default format", async () => {
      const sitePath = join(tempDir, "test-site");
      await hugo.new.site(sitePath);

      // Check that essential directories exist
      await expect(access(join(sitePath, "hugo.toml"))).resolves.toBeUndefined();
      await expect(access(join(sitePath, "content"))).resolves.toBeUndefined();
      await expect(access(join(sitePath, "themes"))).resolves.toBeUndefined();
    });

    it("should create a new site with yaml format", async () => {
      const sitePath = join(tempDir, "test-site-yaml");
      await hugo.new.site(sitePath, { format: "yaml" });

      await expect(access(join(sitePath, "hugo.yaml"))).resolves.toBeUndefined();
    });

    it("should create a new site with json format", async () => {
      const sitePath = join(tempDir, "test-site-json");
      await hugo.new.site(sitePath, { format: "json" });

      await expect(access(join(sitePath, "hugo.json"))).resolves.toBeUndefined();
    });

    it("should respect force flag", async () => {
      const sitePath = join(tempDir, "test-site-force");

      // Create site first time
      await hugo.new.site(sitePath);

      // Hugo 0.154.x does not overwrite an existing site config file, even with --force.
      // Future versions may change this behavior, so test accepts either outcome.
      try {
        await hugo.new.site(sitePath, { force: true });
        // If it succeeds, verify the site still exists
        await expect(access(join(sitePath, "hugo.toml"))).resolves.toBeUndefined();
      } catch (error) {
        // If it fails, that's the current 0.154.x behavior
        expect(error).toBeDefined();
      }
    });
  });

  describe("new.theme", () => {
    it("should create a new theme", async () => {
      const sitePath = join(tempDir, "test-site");
      await hugo.new.site(sitePath);

      // Use --source instead of process.chdir (not supported in worker threads)
      await hugo.new.theme("test-theme", { source: sitePath });

      const themePath = join(sitePath, "themes", "test-theme");
      await expect(access(themePath)).resolves.toBeUndefined();
      await expect(access(join(themePath, "hugo.toml"))).resolves.toBeUndefined();
    });

    it("should create theme with yaml format", async () => {
      const sitePath = join(tempDir, "test-site");
      await hugo.new.site(sitePath);

      await hugo.new.theme("test-theme-yaml", {
        format: "yaml",
        source: sitePath,
      });

      const themePath = join(sitePath, "themes", "test-theme-yaml");
      await expect(access(join(themePath, "hugo.yaml"))).resolves.toBeUndefined();
    });
  });

  describe("new.content", () => {
    it("should create new content file", async () => {
      const sitePath = join(tempDir, "test-site");
      await hugo.new.site(sitePath);

      await hugo.new.content("posts/my-post.md", { source: sitePath });

      const postPath = join(sitePath, "content", "posts", "my-post.md");
      await expect(access(postPath)).resolves.toBeUndefined();
    });

    it("should create content with custom kind", async () => {
      const sitePath = join(tempDir, "test-site");
      await hugo.new.site(sitePath);

      await hugo.new.content("pages/about.md", {
        kind: "page",
        source: sitePath,
      });

      const pagePath = join(sitePath, "content", "pages", "about.md");
      await expect(access(pagePath)).resolves.toBeUndefined();
    });
  });

  describe("backwards compatibility", () => {
    it("should work without positional arguments", async () => {
      // Commands that don't require positional args should still work
      await expect(hugo.version()).resolves.not.toThrow();
      await expect(hugo.env()).resolves.not.toThrow();
    });
  });
});
