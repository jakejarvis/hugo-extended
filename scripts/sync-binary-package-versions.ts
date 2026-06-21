import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { HUGO_PLATFORM_PACKAGES } from "../src/lib/platform";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const packageJsonPath = path.join(currentDir, "..", "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as {
  version: string;
  optionalDependencies?: Record<string, string>;
};

packageJson.optionalDependencies = Object.fromEntries(
  HUGO_PLATFORM_PACKAGES.map((pkg) => [pkg.packageName, packageJson.version]),
);

fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
