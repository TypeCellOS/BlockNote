---
name: knip-skill
description: How Knip is configured in this repo and how to act on its findings. Should be used automatically whenever Knip is run, mentioned, configured, or reports unused files/dependencies/exports — including when deciding whether a flagged item is safe to delete.
---

Knip checks for unused files, dependencies, and exports. Config lives in `knip.json` at the repo root. Several parts of this repo look "unused" to static analysis but are load-bearing, so **verify every finding before deleting** — the config encodes a lot of hard-won exceptions.

# Running Knip

1. **Always regenerate first**: `vp run --filter @blocknote/dev-scripts gen`. Example `package.json`s, `playground/src/examples.gen.tsx`, and part of `docs/package.json`'s dependencies are generated from `.bnexample.json` manifests. Running Knip against stale generated files produces phantom findings.
2. Run via the root script: `pnpm knip` (this is `knip --no-config-hints`). Don't run bare `knip` from a subdirectory.
3. Knip respects `.gitignore` — gitignored files (e.g. `docs/components/example/generated/`) are invisible to it. That is expected, not a coverage bug.
4. Knip is **not wired into CI**. CI only checks that `gen` output is committed and current (`build.yml` "Check generated files are up to date"). Keeping `pnpm knip` at zero findings is a manual discipline — run it before finishing any branch that touches dependencies or exports.

# Triaging findings — check these before deleting anything

A flagged item is a **false positive** (fix the config, not the code) when it is:

- **Referenced by a string path**, not an import — e.g. `docs/components/typstCompilerWasmUrl.ts` via turbopack aliases in `docs/next.config.ts`. Add to the root `ignore` list.
- **A binary invoked from `node_modules/.bin` in a script** — e.g. `wasm-pack` in `packages/xl-typst-compiler/scripts/ensure-wasm.mjs`. Add to that workspace's `ignoreDependencies`.
- **A subpath entry of a package's exports map** — packages with entries beyond `"."` need them listed in the workspace `entry` config (see `packages/math-block`, `packages/diagram-block` with `src/*-exporter/index.{ts,tsx}`, and `packages/xl-pdf-exporter` with `src/react-pdf/index.ts`). Check the package.json `exports` field before deleting an "unused file" that is an `index.ts`.
- **A workspace dep that exists for build ordering, not imports** — e.g. `@blocknote/shared` and `@blocknote/xl-typst-compiler` in root `ignoreDependencies`, and all of playground's `@blocknote/*` deps (see below). Removing them breaks topological build order (locally and on Vercel) even though no source file imports them.
- **Consumed via a namespace import** (`import * as x` then `x.fn(...)` passed around) — Knip can miss this. Keep the export and mark it with a `@public` JSDoc tag, which exempts it (see `getLLMText` in `docs/lib/source/examples.ts`).

Only after ruling those out is a finding a **true positive**: delete the file, remove the dep, or un-export the symbol.

**Be very careful with `knip --fix`.** It once un-exported `getLLMText`, which broke the docs production build because only `next build` (not `types:check`) runs the full route typecheck. Prefer manual fixes; if you use `--fix`, review every hunk.

# Non-standard workspace configs (the "why" behind knip.json)

- **`docs`**: `ignoreDependencies: [".+"]` — dependency checking is disabled **by design**. `gen` syncs deps from docs-embedded example manifests into `docs/package.json`, and docs consumes things through paths Knip can't follow. Do not "improve" this by narrowing the pattern; do not hand-prune docs deps that gen will re-add.
- **`playground`**: `@blocknote/.+` deps drive Vercel's `--filter '@blocknote/example-editor...'` build ordering — never remove them. `katex` and `tex2typst` are resolved from the playground's own `node_modules` by build-mode vite aliases in `playground/vite.config.ts` (a Vercel filtered-install workaround) — keep the ignore list in sync with those aliases: if an alias is added/removed there, mirror it in the dep list and `knip.json`. Everything else was deliberately pruned; playground examples resolve their own deps via per-example `node_modules` (relative imports).
- **`examples/*/*`**: `.bnexample.json` lists only what the example's source imports; the generator auto-injects `@blocknote/core`, `@blocknote/react`, the `uiLib` package (+ `@mantine/core`/`@mantine/hooks` for mantine), `react`, `react-dom` — hence the shared `ignoreDependencies`. A few examples have per-example configs extending it. **Never edit a generated example `package.json` to satisfy Knip** — fix `.bnexample.json` and rerun `gen`.
- Example `"@blocknote/*": "latest"` version specs are deliberate (the StackBlitz open-a-directory repro contract, guarded by `fresh-install-tests.yml`); pnpm's workspace settings resolve them to workspace packages locally. Knip flagging or you pinning these is wrong.
- **`tests`**: has `paths` for `@examples/*`/`@shared/*`; the ambient `declare module` for `@examples` is deliberate (avoids TS6059) — don't convert it to tsconfig paths. `@blocknote/ariakit`/`@blocknote/shadcn` are used by e2e fixtures in ways Knip misses.
- **`packages/dev-scripts`**: templates (`examples/template-react/*.template.tsx`) are entries; `vite-env.d.ts.template.tsx` is ignored (it's emitted verbatim, never imported).

# When adding new packages or deps

- New package with subpath exports → add an `entry` config for it in `knip.json`.
- New workspace dep added only for build ordering → add it to root `ignoreDependencies` with the others, don't leave Knip red.
- New generated or string-referenced file → root `ignore` list.
- After any of the above, `pnpm knip` must exit 0 before the branch is done.
