import { describe, expect, it } from "vitest";
import { buildArgs } from "../../src/lib/args";

describe("buildArgs", () => {
  describe("basic command", () => {
    it("should handle command without options", () => {
      const args = buildArgs("build");
      expect(args).toEqual(["build"]);
    });

    it("should handle multi-word command", () => {
      const args = buildArgs("mod clean");
      expect(args).toEqual(["mod", "clean"]);
    });
  });

  describe("positional arguments", () => {
    it("should add positional arguments after command", () => {
      const args = buildArgs("new site", ["my-site"]);
      expect(args).toEqual(["new", "site", "my-site"]);
    });

    it("should handle multiple positional arguments", () => {
      const args = buildArgs("command", ["arg1", "arg2", "arg3"]);
      expect(args).toEqual(["command", "arg1", "arg2", "arg3"]);
    });

    it("should handle positional args with options", () => {
      const args = buildArgs("new site", ["my-site"], { format: "yaml" });
      expect(args).toEqual(["new", "site", "my-site", "--format", "yaml"]);
    });
  });

  describe("boolean flags", () => {
    it("should add flag when true", () => {
      const args = buildArgs("build", undefined, { minify: true });
      expect(args).toContain("--minify");
    });

    it("should not add flag when false", () => {
      const args = buildArgs("build", undefined, { minify: false });
      expect(args).not.toContain("--minify");
    });

    it("should handle multiple boolean flags", () => {
      const args = buildArgs("build", undefined, {
        minify: true,
        buildDrafts: true,
        cleanDestinationDir: false,
      });
      expect(args).toContain("--minify");
      // Flags with an explicit spec keep Hugo's canonical casing.
      expect(args).toContain("--buildDrafts");
      expect(args).not.toContain("--cleanDestinationDir");
    });
  });

  describe("string flags", () => {
    it("should add flag with value", () => {
      const args = buildArgs("server", undefined, { port: 1313 });
      expect(args).toContain("--port");
      expect(args).toContain("1313");
    });

    it("should keep spec flag casing (e.g. baseURL)", () => {
      const args = buildArgs("server", undefined, {
        baseURL: "http://localhost",
      });
      expect(args).toContain("--baseURL");
      expect(args).toContain("http://localhost");
    });

    it("should convert unknown camelCase to kebab-case", () => {
      const args = buildArgs("build", undefined, {
        someUnknownFlag: "value",
      });
      expect(args).toContain("--some-unknown-flag");
      expect(args).toContain("value");
    });
  });

  describe("array flags", () => {
    it("should repeat flag for each array element", () => {
      const args = buildArgs("build", undefined, { theme: ["a", "b", "c"] });
      const themeIndices = args.reduce<number[]>((acc, arg, i) => {
        if (arg === "--theme") acc.push(i);
        return acc;
      }, []);

      expect(themeIndices).toHaveLength(3);
      expect(args[themeIndices[0] + 1]).toBe("a");
      expect(args[themeIndices[1] + 1]).toBe("b");
      expect(args[themeIndices[2] + 1]).toBe("c");
    });
  });

  describe("complex scenarios", () => {
    it("should handle mixed flags and positional args", () => {
      const args = buildArgs("new content", ["posts/my-post.md"], {
        kind: "post",
        force: true,
        editor: "vim",
      });

      expect(args).toEqual([
        "new",
        "content",
        "posts/my-post.md",
        "--kind",
        "post",
        "--force",
        "--editor",
        "vim",
      ]);
    });

    it("should skip undefined and null values", () => {
      const args = buildArgs("build", undefined, {
        minify: true,
        baseURL: undefined,
        destination: null,
      });

      expect(args).toContain("--minify");
      expect(args).not.toContain("--base-u-r-l");
      expect(args).not.toContain("--destination");
    });
  });
});
