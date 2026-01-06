#!/usr/bin/env node

/**
 * Postinstall wrapper script that properly handles errors during Hugo binary installation.
 * This script imports and executes the install function, logging any errors with full stack traces
 * and exiting with a non-zero code on failure.
 */

async function run() {
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
