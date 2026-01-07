#!/usr/bin/env node
import { spawn } from "node:child_process";
import hugo from "./hugo";

// Handle unexpected promise rejections
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
  process.exitCode = 1;
});

(async () => {
  try {
    const args = process.argv.slice(2);
    const bin = await hugo();

    const child = spawn(bin, args, { stdio: "inherit" });

    // Handle spawn errors (e.g., binary not found)
    child.on("error", (err) => {
      console.error("Failed to spawn Hugo binary:", err.message);
      process.exitCode = 1;
    });

    // Forward Hugo's exit code so this module itself reports success/failure
    child.on("exit", (code) => {
      process.exitCode = code ?? undefined;
    });
  } catch (err) {
    console.error(
      "Failed to initialize Hugo:",
      err instanceof Error ? err.message : err,
    );
    process.exitCode = 1;
  }
})();
