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
  - **macOS**: uses `sudo installer -pkg ... -target /` (and then symlinks `bin/hugo` -> `/usr/local/bin/hugo`).
  - **non-macOS**: extracts archive into `bin/` and `chmod +x`.

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
npm run test:coverage    # coverage via v8
```

### Test layout

- `tests/unit/*`
  - Fast, pure TS/JS (no Hugo execution).
  - Example: `tests/unit/args.test.ts` covers argv building behavior driven by `flags.json`.
  - Example: `tests/unit/types.test.ts` uses `expectTypeOf` to validate type surfaces.

- `tests/integration/*`
  - Executes real Hugo commands and does real filesystem work in temp dirs.
  - **Avoid `process.chdir()`** in tests: Vitest worker contexts may not support it.
    - Prefer passing Hugo’s global `--source` via `{ source: sitePath }`.

### Integration test expectations to keep in mind

- Hugo output is noisy (e.g. “Congratulations! Your new Hugo site…”). Tests should assert on filesystem results instead of brittle stdout text.
- Hugo scaffolding changes over time:
  - Example: `hugo new theme` in 0.154.x generates a theme skeleton with `hugo.toml` / `hugo.yaml` rather than `theme.toml`.
- Some flags may exist but not behave as you’d intuit for a given command:
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

