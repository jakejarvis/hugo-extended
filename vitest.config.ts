import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Run tests in Node environment
    environment: "node",

    // Test file patterns
    include: ["tests/**/*.test.ts"],

    // Don't show noisy Hugo output unless the test fails
    silent: "passed-only",

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/generated/**",
        "src/**/*.d.ts",
        "**/*.test.ts",
        "scripts/**",
      ],
    },

    // Timeout for integration tests (some may be slow)
    testTimeout: 30000,

    // Vitest 4: avoid forks on macOS (can produce kill EPERM on teardown) and
    // keep files sequential to reduce contention around Hugo + temp dirs.
    pool: "threads",
    fileParallelism: false,
  },
});
