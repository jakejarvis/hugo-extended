import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ENV_VAR_DOCS, getEnvConfig } from "../../src/lib/env";

describe("env", () => {
  const envVars = ["HUGO_BIN_PATH"];
  const originalEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of envVars) {
      originalEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of envVars) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    }
  });

  describe("getEnvConfig", () => {
    it("returns undefined when HUGO_BIN_PATH is not set", () => {
      expect(getEnvConfig()).toEqual({ binPath: undefined });
    });

    it("returns the trimmed value from HUGO_BIN_PATH", () => {
      process.env.HUGO_BIN_PATH = "  /usr/local/bin/hugo  ";

      expect(getEnvConfig()).toEqual({ binPath: "/usr/local/bin/hugo" });
    });

    it("ignores empty values", () => {
      process.env.HUGO_BIN_PATH = "   ";

      expect(getEnvConfig()).toEqual({ binPath: undefined });
    });
  });

  describe("ENV_VAR_DOCS", () => {
    it("documents only HUGO_BIN_PATH", () => {
      expect(ENV_VAR_DOCS).toEqual([
        {
          key: "binPath",
          name: "HUGO_BIN_PATH",
          aliases: [],
          description: "Path to a pre-existing Hugo binary",
          type: "string",
          default: undefined,
        },
      ]);
    });
  });
});
