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
    - `getHugoBinary` (binary resolution + auto-install if missing)
    - `exec` / `execWithOutput` (spawn Hugo with argv built from options)
    - `hugo` (builder object)

- **CLI entry**: `src/cli.ts`
  - Resolves the binary path via the default export and forwards `process.argv.slice(2)` to Hugo.

- **Binary installation**: `src/lib/install.ts`
  - Downloads Hugo release assets and verifies SHA-256 checksums.
  - **macOS v0.153.0+**: uses `pkgutil --expand-full` to extract the binary from the `.pkg` file (no sudo required).
  - **macOS pre-v0.153.0**: extracts `.tar.gz` archive into `bin/`.
  - **non-macOS**: extracts archive into `bin/` and `chmod +x`.

- **Environment variables**: `src/lib/env.ts`
  - Centralized handling of all `HUGO_*` environment variables.
  - Exports `getEnvConfig()` for reading parsed config, `logger` for quiet-aware logging.
  - Exports `ENV_VAR_DOCS` for programmatic access to variable metadata.

- **Postinstall**: `postinstall.js`
  - For published packages (where `dist/` exists), runs the compiled installer.
  - For repo/dev/CI (where `dist/` may not exist), exits successfully and skips installation.

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
  - Example: `tests/unit/utils.test.ts` covers platform detection, release filename resolution.
  - Example: `tests/unit/install.test.ts` covers checksum parsing, archive type detection.

- `tests/integration/*`
  - Executes real Hugo commands and does real filesystem work in temp dirs.
  - **Avoid `process.chdir()`** in tests: Vitest worker contexts may not support it.
    - Prefer passing Hugo's global `--source` via `{ source: sitePath }`.

- `tests/e2e/*`
  - End-to-end tests for the full installation pipeline.
  - Verifies binary installation, permissions, symlinks (macOS), and version matching.
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

- If you touch installation (`src/lib/install.ts` / `postinstall.js`):
  - macOS install path uses `sudo installer` and will behave differently in CI/sandboxed environments.
  - Tests are intentionally focused on the wrapper behavior, not on end-to-end installer reliability.

- If you touch exports in `src/hugo.ts`:
  - Remember: consumers rely on the **default export being callable** (binary path) and having builder methods attached.

- If you touch environment variables (`src/lib/env.ts`):
  - All env vars are defined in `ENV_VARS` with name, aliases, parse function, and description.
  - Boolean env vars accept: `1`, `true`, `yes`, `on` (case-insensitive).
  - Use `getEnvConfig()` to read config; use `logger.info/warn/error` for quiet-aware output.
  - `postinstall.js` has its own minimal env parsing (can't import TypeScript modules).

## Environment variables reference

| Variable | Type | Description |
|----------|------|-------------|
| `HUGO_OVERRIDE_VERSION` | string | Install a different Hugo version (ignores package.json) |
| `HUGO_NO_EXTENDED` | boolean | Force vanilla Hugo instead of Extended |
| `HUGO_SKIP_DOWNLOAD` | boolean | Skip postinstall binary download |
| `HUGO_BIN_PATH` | string | Use a pre-existing Hugo binary |
| `HUGO_MIRROR_BASE_URL` | string | Custom download mirror URL |
| `HUGO_SKIP_CHECKSUM` | boolean | Skip SHA-256 verification |
| `HUGO_QUIET` | boolean | Suppress installation output |

Some variables have aliases (e.g., `HUGO_FORCE_STANDARD` → `HUGO_NO_EXTENDED`, `HUGO_SILENT` → `HUGO_QUIET`). Check `ENV_VARS` in `src/lib/env.ts` for the full list.

### Proxy support

The installer automatically respects standard proxy environment variables via `undici`'s `EnvHttpProxyAgent`:

| Variable | Description |
|----------|-------------|
| `HTTP_PROXY` / `http_proxy` | Proxy server for HTTP requests |
| `HTTPS_PROXY` / `https_proxy` | Proxy server for HTTPS requests |
| `NO_PROXY` / `no_proxy` | Comma-separated list of hosts to bypass proxy |

Lowercase variants take precedence over uppercase (matching standard convention). The proxy URL is logged once during installation (respects `HUGO_QUIET`).

### Version-dependent behavior

- **macOS v0.153.0+**: Hugo ships as `.pkg` installer, extracted locally using `pkgutil --expand-full` (no sudo required).
- **macOS pre-v0.153.0**: Hugo ships as `.tar.gz`, extracted to `bin/` directly.
- The `usesMacOSPkg(version)` and `compareVersions(a, b)` utilities in `src/lib/utils.ts` handle this.
