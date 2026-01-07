# <img src="https://raw.githubusercontent.com/gohugoio/gohugoioTheme/master/static/images/hugo-logo-wide.svg?sanitize=true" alt="Hugo" width="115"> via NPM

[![NPM Version](https://img.shields.io/npm/v/hugo-extended?color=blue)](https://www.npmjs.com/package/hugo-extended)
[![NPM Downloads](https://img.shields.io/npm/dw/hugo-extended?color=rebeccapurple)](https://www.npmjs.com/package/hugo-extended)
[![CI status](https://github.com/jakejarvis/hugo-extended/workflows/Run%20tests/badge.svg)](https://github.com/jakejarvis/hugo-extended/actions)

> Plug-and-play binary wrapper for [Hugo Extended](https://gohugo.io/), the awesomest static-site generator. Now with full TypeScript support and type-safe APIs!

## Features

- 🚀 **Zero configuration** — Hugo binary is automatically downloaded on install
- 📦 **Version-locked** — Package version matches Hugo version (e.g., `hugo-extended@0.140.0` = Hugo v0.140.0)
- 🔒 **Type-safe API** — Full TypeScript support with autocomplete for all Hugo commands and flags
- ⚡ **Multiple APIs** — Use CLI, function-based, or builder-style APIs
- 🎯 **Extended by default** — Automatically uses Hugo Extended on supported platforms

## Installation

```sh
npm install hugo-extended --save-dev
# or
yarn add hugo-extended --dev
# or
pnpm add hugo-extended --save-dev
```

### SCSS/PostCSS Support

If you're using Hugo's SCSS features, you'll also want:

```sh
npm install postcss postcss-cli autoprefixer --save-dev
```

These integrate seamlessly with Hugo's [built-in PostCSS pipes](https://gohugo.io/functions/css/postcss/).

## Usage

### CLI Usage

The simplest way — just run `hugo` commands directly:

```jsonc
// package.json
{
  "scripts": {
    "dev": "hugo server --buildDrafts",
    "build": "hugo --minify",
    "build:preview": "hugo --baseURL \"${DEPLOY_PRIME_URL:-/}\" --buildDrafts --buildFuture"
  }
}
```

```sh
npm run dev
```

### Programmatic API

#### Builder-style API

A fluent interface where each Hugo command is a method:

```typescript
import hugo from "hugo-extended";

// Start server
await hugo.server({
  port: 1313,
  buildDrafts: true,
});

// Build site
await hugo.build({
  minify: true,
  environment: "production",
});

// Module commands
await hugo.mod.get();
await hugo.mod.tidy();
await hugo.mod.clean({ all: true });

// Generate shell completions
await hugo.completion.zsh();
```

#### Function-based API

Use `exec()` for commands that output to the console, or `execWithOutput()` to capture the output:

```typescript
import { exec, execWithOutput } from "hugo-extended";

// Start development server with full type safety
await exec("server", {
  port: 1313,
  buildDrafts: true,
  navigateToChanged: true,
});

// Build for production
await exec("build", {
  minify: true,
  cleanDestinationDir: true,
  baseURL: "https://example.com",
});

// Capture command output
const { stdout } = await execWithOutput("version");
console.log(stdout); // "hugo v0.140.0+extended darwin/arm64 ..."

// List all content pages
const { stdout: pages } = await execWithOutput("list all");
```

#### Direct Binary Access

For advanced use cases, get the Hugo binary path directly:

```typescript
import hugo from "hugo-extended";
import { spawn } from "child_process";

const binPath = await hugo();
console.log(binPath); // "/usr/local/bin/hugo" or similar

// Use with spawn, exec, or any process library
spawn(binPath, ["version"], { stdio: "inherit" });
```

### Type Imports

Import Hugo types for use in your own code:

```typescript
import type { HugoCommand, HugoOptionsFor, HugoServerOptions } from "hugo-extended";

// Type-safe option objects
const serverOpts: HugoServerOptions = {
  port: 1313,
  buildDrafts: true,
  disableLiveReload: false,
};

// Generic helper
function runHugo<C extends HugoCommand>(cmd: C, opts: HugoOptionsFor<C>) {
  // ...
}
```

## API Reference

### `exec(command, options?)`

Execute a Hugo command with inherited stdio (output goes to console).

- **command** — Hugo command string (e.g., `"server"`, `"build"`, `"mod clean"`)
- **options** — Type-safe options object (optional)
- **Returns** — `Promise<void>`

### `execWithOutput(command, options?)`

Execute a Hugo command and capture output.

- **command** — Hugo command string
- **options** — Type-safe options object (optional)
- **Returns** — `Promise<{ stdout: string; stderr: string }>`

### `hugo` (default export)

The default export is both callable (returns binary path) and has builder methods:

```typescript
// Get binary path (backward compatible)
const binPath = await hugo();

// Builder methods
await hugo.build({ minify: true });
await hugo.server({ port: 3000 });
```

### Available Commands

All Hugo commands are fully typed with autocomplete:

| Command | Builder Method | Description |
|---------|---------------|-------------|
| `build` | `hugo.build()` | Build your site |
| `server` | `hugo.server()` | Start dev server |
| `new` | `hugo.new()` | Create new content |
| `mod get` | `hugo.mod.get()` | Download modules |
| `mod tidy` | `hugo.mod.tidy()` | Clean go.mod/go.sum |
| `mod clean` | `hugo.mod.clean()` | Clean module cache |
| `mod vendor` | `hugo.mod.vendor()` | Vendor dependencies |
| `list all` | `hugo.list.all()` | List all content |
| `list drafts` | `hugo.list.drafts()` | List draft content |
| `config` | `hugo.config()` | Print configuration |
| `version` | `hugo.version()` | Print version |
| `env` | `hugo.env()` | Print environment |
| ... | ... | [All Hugo commands supported](https://gohugo.io/commands/) |

## Platform Support

Hugo Extended is automatically used on supported platforms:

| Platform | Architecture | Hugo Extended |
|----------|-------------|---------------|
| macOS | x64, ARM64 | ✅ |
| Linux | x64, ARM64 | ✅ |
| Windows | x64 | ✅ |
| Windows | ARM64 | ❌ (vanilla Hugo) |
| FreeBSD | x64 | ❌ (vanilla Hugo) |

## Troubleshooting

### Hugo binary not found

If Hugo seems to disappear (rare edge case), it will be automatically reinstalled on next use. You can also manually trigger reinstallation:

```sh
npm rebuild hugo-extended
```

### Permission issues on macOS

As of [v0.153.0](https://github.com/gohugoio/hugo/releases/tag/v0.153.0), Hugo is distributed as a full installer for macOS, rather than a simple binary/executable file. This package will make its best effort to run the installer for you (which includes prompting you for `sudo` access) but this method introduces infinitely more opportunities for things to go wrong. Please [open an issue](https://github.com/jakejarvis/hugo-extended/issues/new) if you encounter any issues.

## License

This project is distributed under the [MIT License](LICENSE). Hugo is distributed under the [Apache License 2.0](https://github.com/gohugoio/hugo/blob/master/LICENSE).
