# AGENTS.md

Notes for LLM coding agents working on `hugo-extended`.

## What this repo is

`hugo-extended` is a **version-locked** Node package that wraps the Hugo CLI:

- **Package version == Hugo version** (e.g. `0.154.3`).
- Provides:
  - **CLI passthrough** (`hugo` / `hugo-extended` binaries -> `dist/cli.mjs`)
  - **Programmatic API** (type-safe `exec`, `execWithOutput`, and builder-style `hugo.*`)
  - **Direct binary path access** (default export is callable and resolves to the Hugo binary path)

## Key files / mental model

- **Public API**: `src/hugo.ts`
  - `default export`: callable function that returns the Hugo binary path **and** has builder methods attached.
  - Named exports:
    - `getHugoBinary` (binary resolution via `HUGO_BIN_PATH` or platform package)
    - `exec` / `execWithOutput` (spawn Hugo with argv built from options)
    - `hugo` (builder object)

- **CLI entry**: `src/cli.ts`
  - Resolves the binary path via the default export and forwards `process.argv.slice(2)` to Hugo.

- **Platform binary packages**: `src/lib/platform.ts`
  - Maps supported platform/architecture pairs to exact optional npm packages under `@jakejarvis`.
  - Extended packages use `hugo-extended-*` names only where upstream Hugo ships Extended.
  - Windows ARM64 uses the vanilla `@jakejarvis/hugo-windows-arm64` package.

- **Binary package generation**: `scripts/generate-binary-packages.ts`
  - Downloads Hugo release assets and verifies SHA-256 checksums during release packaging.
  - **macOS v0.153.0+**: uses `pkgutil --expand-full` to extract the binary from the `.pkg` file, so the macOS package must be generated on macOS.
  - `.tar.gz` and `.zip` assets can be generated on Linux/macOS.
  - Emits publishable package directories in `dist-platforms/`.

- **Environment variables**: `src/lib/env.ts`
  - Centralized handling of `HUGO_BIN_PATH`.
  - Exports `getEnvConfig()` for reading parsed config.
  - Exports `ENV_VAR_DOCS` for programmatic access to variable metadata.

- **Argv builder**: `src/lib/args.ts`
  - Builds argv using `src/generated/flags.json` to understand flag kinds and canonical long names.
  - Important: **when a flag exists in the generated spec, its long name is used as-is** (e.g. `--baseURL`, `--buildDrafts`).

- **Generated inputs** (committed):
  - `src/generated/types.ts`: command/options types.
  - `src/generated/flags.json`: runtime flag spec used by argv building.

## Code generation (types + flag spec)

`scripts/generate-types.ts`:

- Runs Hugo help output traversal (BFS across the command tree).
- Emits:
  - `src/generated/types.ts`
  - `src/generated/flags.json`

When bumping Hugo versions, **regenerate these files** and expect downstream changes in:

- Flag names/casing (Hugo sometimes prefers mixed case like `baseURL`)
- Which commands support which flags
- Integration-test filesystem outputs (Hugo occasionally changes scaffolding)

## Testing (concise)

This repo uses **Vitest**.

### Commands

```bash
npm test                 # all tests (vitest run)
npm run test:watch       # watch mode
npm run test:unit        # unit tests only
npm run test:integration # integration tests only (runs real Hugo)
npm run test:e2e         # end-to-end installation tests
npm run test:coverage    # coverage via v8
```

### Test layout

- `tests/unit/*`
  - Fast, pure TS/JS (no Hugo execution).
  - Example: `tests/unit/args.test.ts` covers argv building behavior driven by `flags.json`.
  - Example: `tests/unit/types.test.ts` uses `expectTypeOf` to validate type surfaces.
  - Example: `tests/unit/utils.test.ts` covers platform package detection and binary path resolution.
  - Example: `tests/unit/binary-packages.test.ts` covers generated package manifests, checksum parsing, and archive type detection.

- `tests/integration/*`
  - Executes real Hugo commands and does real filesystem work in temp dirs.
  - **Avoid `process.chdir()`** in tests: Vitest worker contexts may not support it.
    - Prefer passing Hugo's global `--source` via `{ source: sitePath }`.

- `tests/e2e/*`
  - End-to-end tests for the resolved Hugo binary.
  - Verifies binary presence, permissions, and version matching.
  - Platform-specific tests use `it.skipIf()` to skip on unsupported platforms.

### Integration test expectations to keep in mind

- Hugo output is noisy (e.g. "Congratulations! Your new Hugo site…"). Tests should assert on filesystem results instead of brittle stdout text.
- Hugo scaffolding changes over time:
  - Example: `hugo new theme` in 0.154.x generates a theme skeleton with `hugo.toml` / `hugo.yaml` rather than `theme.toml`.
- Some flags may exist but not behave as you'd intuit for a given command:
  - Example: `hugo new site --force` does **not** overwrite an existing `hugo.toml` in 0.154.x.

## Practical tips for agents making changes

- If you touch argv generation (`src/lib/args.ts`):
  - Re-run `npm run generate-types` if the change depends on spec shape.
  - Prefer making tests match **the committed generated spec**, not an assumed kebab-case transform.

- If you touch binary package generation (`scripts/generate-binary-packages.ts`):
  - macOS `.pkg` extraction requires macOS `pkgutil`.
  - Keep generated package manifests script-free.
  - Use exact package versions that match the root package/Hugo version.

- If you touch exports in `src/hugo.ts`:
  - Remember: consumers rely on the **default export being callable** (binary path) and having builder methods attached.

- If you touch environment variables (`src/lib/env.ts`):
  - `HUGO_BIN_PATH` is the only supported runtime override.
  - Use `getEnvConfig()` to read config.

## Environment variables reference

| Variable        | Type   | Description                    |
| --------------- | ------ | ------------------------------ |
| `HUGO_BIN_PATH` | string | Use a pre-existing Hugo binary |

### Version-dependent behavior

- **macOS v0.153.0+**: Hugo ships as a `.pkg`; release packaging extracts it using `pkgutil --expand-full`.
- Runtime code does not download or extract Hugo.
