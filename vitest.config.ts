import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    silent: "passed-only", // Don't show noisy Hugo output unless the test fails
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/generated/**", "src/**/*.d.ts", "**/*.test.ts", "scripts/**"],
    },
    testTimeout: 30000,
    pool: "threads",
    fileParallelism: false,
  },
});
