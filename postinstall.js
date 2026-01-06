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
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const installPath = join(__dirname, "dist", "lib", "install.mjs");

async function run() {
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
