# <img src="https://raw.githubusercontent.com/gohugoio/gohugoioTheme/master/static/images/hugo-logo-wide.svg?sanitize=true" alt="Hugo" width="115"> via NPM

[![NPM Version](https://img.shields.io/npm/v/hugo-extended?color=blue)](https://www.npmjs.com/package/hugo-extended)
[![NPM Downloads](https://img.shields.io/npm/dw/hugo-extended?color=rebeccapurple)](https://www.npmjs.com/package/hugo-extended)
[![CI status](https://github.com/jakejarvis/hugo-extended/workflows/Run%20tests/badge.svg)](https://github.com/jakejarvis/hugo-extended/actions)

A plug-and-play NPM wrapper for the [Hugo](https://gohugo.io/) static-site generator.

## Features

- **CLI passthrough** – Run Hugo with `hugo` (or `hugo-extended`) from `package.json` scripts.
- **Predictable versioning** – `hugo-extended`'s version in `package.json` will always match the version of Hugo invoked by your package manager.
- **Type-safe API** – Generated command and option types for the Hugo version in this package.
- **Builder API** – Call common commands as methods such as `hugo.server()` and `hugo.new.project()` programmatically.
- **No install-time scripts** – Runtime resolution uses optional platform and architecture-specific NPM packages.

## Requirements

- Node.js `>=22.12.0`
- A package manager that installs optional dependencies (unless you set `HUGO_BIN_PATH`; see [Binary Resolution](#binary-resolution) below)

## Installation

```sh
npm install hugo-extended --save-dev
# or...
pnpm add hugo-extended --save-dev
# or...
bun add hugo-extended --dev
# or...
yarn add hugo-extended --dev
```

> [!IMPORTANT]
> **Recommended:** Use `--save-exact` to ensure your team is developing against the same Hugo version.

## CLI Usage

Call the `hugo` binary from NPM scripts just like you would with a system-wide Hugo installation:

```jsonc
// package.json
{
  "scripts": {
    "dev": "hugo server --buildDrafts",
    "build": "hugo --minify",
    "build:preview": "hugo --baseURL \"${DEPLOY_PRIME_URL:-/}\" --buildDrafts --buildFuture",
  },
}
```

```sh
npm run dev
```

The wrapper resolves the binary, forwards all arguments to Hugo, and exits with Hugo's exit code.

## TypeScript API

### Builder API

The default export is callable and also has builder methods attached:

```ts
import hugo from "hugo-extended";

await hugo.server({
  source: "site",
  port: 1313,
  buildDrafts: true,
  navigateToChanged: true,
});

await hugo.build({
  source: "site",
  minify: true,
  cleanDestinationDir: true,
  baseURL: "https://example.com/",
});

await hugo.new.project("site", { format: "yaml" });
await hugo.new.content("posts/hello.md", {
  source: "site",
  kind: "post",
});
await hugo.mod.tidy({ source: "site" });
```

> [!NOTE]
> Builder methods inherit stdio, so Hugo output is printed directly to the current process. Use `execWithOutput()` when you need to capture output.

### Function API

Use `exec()` when you want inherited stdio:

```ts
import { exec } from "hugo-extended";

await exec("server", {
  source: "site",
  port: 1313,
  buildDrafts: true,
});

await exec("new project", ["site"], {
  format: "yaml",
});
```

Use `execWithOutput()` when you need stdout and stderr:

```ts
import { execWithOutput } from "hugo-extended";

const { stdout } = await execWithOutput("version");
console.log(stdout);

const { stdout: pages } = await execWithOutput("list all", {
  source: "site",
});
console.log(pages);
```

### Binary Path Access

Call the default export or `getHugoBinary()` to resolve the executable:

```ts
import { spawn } from "node:child_process";
import hugo, { getHugoBinary } from "hugo-extended";

const binFromDefault = await hugo();
const binFromNamedExport = await getHugoBinary();

spawn(binFromDefault, ["version"], { stdio: "inherit" });
console.log(binFromNamedExport);
```

### Types

The main entry exports the generic command helpers:

```ts
import type { HugoCommand, HugoOptionsFor } from "hugo-extended";

function run<C extends HugoCommand>(command: C, options: HugoOptionsFor<C>) {
  return { command, options };
}
```

Generated command-specific interfaces are available from `hugo-extended/types`:

```ts
import type { HugoServerOptions } from "hugo-extended/types";

const options: HugoServerOptions = {
  source: "site",
  port: 1313,
  buildDrafts: true,
};
```

## Commands and Options

Command and option types are generated from `hugo help` output for the Hugo version locked to this package. Regenerate them when bumping the Hugo version.

Options use camelCase property names:

```ts
await hugo.build({
  baseURL: "https://example.com/",
  buildDrafts: true,
  cleanDestinationDir: true,
});
```

When an option exists in the generated flag spec, the wrapper preserves Hugo's canonical long flag exactly, including mixed-case flags such as `--baseURL` and `--buildDrafts`. Unknown camelCase properties fall back to kebab-case.

Value handling:

- Boolean options are emitted only when `true`.
- String and number options are emitted as `--flag value`.
- Array options repeat the flag once per value.
- `undefined` and `null` options are skipped.

If a command is not exposed as a builder method, use `exec("command name", ...)` or `execWithOutput("command name", ...)`.

## Binary Resolution

At runtime, `hugo-extended` resolves the binary in this order:

1. `HUGO_BIN_PATH`, when set.
2. The platform-specific optional dependency for the current OS and CPU.

Runtime code never downloads, installs, or extracts Hugo.

| Platform | Architecture | Package                                      | Edition      |
| -------- | ------------ | -------------------------------------------- | ------------ |
| macOS    | x64, arm64   | `@jakejarvis/hugo-extended-darwin-universal` | Extended     |
| Linux    | x64          | `@jakejarvis/hugo-extended-linux-amd64`      | Extended     |
| Linux    | arm64        | `@jakejarvis/hugo-extended-linux-arm64`      | Extended     |
| Windows  | x64          | `@jakejarvis/hugo-extended-windows-amd64`    | Extended     |
| Windows  | arm64        | `@jakejarvis/hugo-windows-arm64`             | Vanilla Hugo |

Unsupported platforms can still use this package by setting `HUGO_BIN_PATH` to a compatible Hugo executable.

## Environment Variables

| Variable        | Type   | Description                                  |
| --------------- | ------ | -------------------------------------------- |
| `HUGO_BIN_PATH` | string | Absolute path to a pre-existing Hugo binary. |

```sh
HUGO_BIN_PATH=/usr/local/bin/hugo npm run build
```

For programmatic access, import `getEnvConfig()` or `ENV_VAR_DOCS`:

```ts
import { ENV_VAR_DOCS, getEnvConfig } from "hugo-extended";

console.log(getEnvConfig());
console.log(ENV_VAR_DOCS);
```

## SCSS and PostCSS

Hugo's SCSS support is provided by Hugo Extended. If your site uses Hugo's PostCSS integration, install the Node tools your Hugo pipeline expects:

```sh
npm install postcss postcss-cli autoprefixer --save-dev
```

See Hugo's [PostCSS documentation](https://gohugo.io/functions/css/postcss/) for pipeline configuration.

## Development

Install dependencies:

```sh
npm install
```

Common commands:

```sh
npm run build
npm run check-types
npm run lint
npm run fmt:check
npm test
```

Test targets:

```sh
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:coverage
```

Integration and e2e tests run the resolved Hugo binary. In tests that operate on a site directory, prefer passing Hugo's global `source` option over changing `process.cwd()`.

### Regenerating Types

[`generate-types.ts`](scripts/generate-types.ts) traverses Hugo help output and writes:

- `src/generated/types.ts`
- `src/generated/flags.json`

These generated files are committed source inputs. After bumping the Hugo version, run:

```sh
npm run generate-types
```

### Generating Platform Packages

[`generate-packages.ts`](scripts/generate-packages.ts) downloads Hugo release assets, verifies SHA-256 checksums, extracts the binary, and writes publishable packages to `dist-platforms/`.

Generate the package for the current platform:

```sh
npm run generate-packages
```

Generate one package by name:

```sh
npm run generate-packages -- --package @jakejarvis/hugo-extended-linux-amd64
```

Generate all packages:

```sh
npm run generate-packages -- --all
```

macOS Hugo v0.153.0 and newer ships as a `.pkg`. Generating the macOS package requires macOS because extraction uses `pkgutil --expand-full`. `.tar.gz` and `.zip` assets can be generated on Linux or macOS.

## Troubleshooting

### Hugo binary package not found

This usually means optional dependencies were not installed. Reinstall with optional dependencies enabled:

```sh
npm install --include=optional
```

If your environment intentionally omits optional dependencies, set `HUGO_BIN_PATH` instead.

### Unsupported platform

Set `HUGO_BIN_PATH` to a Hugo binary built for your platform:

```sh
HUGO_BIN_PATH=/opt/bin/hugo npx hugo version
```

### macOS packaging

The macOS platform package is created during release packaging from Hugo's upstream `.pkg` asset. Consumers do not need sudo access, global installation, or install-time scripts.

## License

This project is distributed under the [MIT License](LICENSE). Hugo is distributed under the [Apache License 2.0](https://github.com/gohugoio/hugo/blob/master/LICENSE).
