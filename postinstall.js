#!/usr/bin/env node

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Postinstall wrapper script that properly handles errors during Hugo binary installation.
 * This script imports and executes the install function, logging any errors with full stack traces
 * and exiting with a non-zero code on failure.
 *
 * During development/CI (before build), the dist folder won't exist and this script will exit gracefully.
 * For published packages, the dist folder is included and installation will proceed.
 *
 * Environment variables:
 * - HUGO_SKIP_DOWNLOAD: Skip installation entirely (useful for CI caching, Docker layers)
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const installPath = join(__dirname, "dist", "lib", "install.mjs");

/**
 * Check if an environment variable is set to a truthy value.
 * @param {string} name - Environment variable name
 * @returns {boolean}
 */
function isEnvTruthy(name) {
  const value = process.env[name];
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase().trim());
}

async function run() {
  // Skip installation if HUGO_SKIP_DOWNLOAD is set
  if (isEnvTruthy("HUGO_SKIP_DOWNLOAD")) {
    console.log("Skipping Hugo installation (HUGO_SKIP_DOWNLOAD is set)");
    process.exit(0);
  }

  // Skip installation if dist folder doesn't exist (development/CI environment)
  if (!existsSync(installPath)) {
    console.log(
      "Skipping Hugo installation (dist not found - likely in CI or development environment)",
    );
    process.exit(0);
  }

  try {
    const m = await import("./dist/lib/install.mjs");
    await m.default();
  } catch (error) {
    console.error("Hugo installation failed:");
    console.error(error);
    process.exit(1);
  }
}

run();
