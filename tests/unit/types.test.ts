import { describe, expectTypeOf, it } from "vitest";
import type { HugoCommand, HugoOptionsFor } from "../../src/generated/types";

describe("Type Safety", () => {
  it("should have correct command types", () => {
    expectTypeOf<HugoCommand>().toEqualTypeOf<
      "build" | "server" | "new site" | "new theme" | "new content"
    >();
  });

  it("should map commands to correct option types", () => {
    type BuildOpts = HugoOptionsFor<"build">;
    type ServerOpts = HugoOptionsFor<"server">;
    type NewSiteOpts = HugoOptionsFor<"new site">;
    type NewThemeOpts = HugoOptionsFor<"new theme">;

    // Build options should have minify
    expectTypeOf<BuildOpts>().toHaveProperty("minify");

    // Server options should have port
    expectTypeOf<ServerOpts>().toHaveProperty("port");

    // New site options should have format
    expectTypeOf<NewSiteOpts>().toHaveProperty("format");

    // New theme options should have format
    expectTypeOf<NewThemeOpts>().toHaveProperty("format");
  });

  it("should inherit global options", () => {
    type BuildOpts = HugoOptionsFor<"build">;

    // All commands should have global options
    expectTypeOf<BuildOpts>().toHaveProperty("source");
    expectTypeOf<BuildOpts>().toHaveProperty("destination");
    expectTypeOf<BuildOpts>().toHaveProperty("environment");
  });
});
