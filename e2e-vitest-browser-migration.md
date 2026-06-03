# Migrate the e2e suite from Playwright to Vitest Browser Mode

## Context

BlockNote is adopting **Vite Plus** (the `vp` CLI), which bundles **Vitest 4.1.5 Browser Mode** with a built-in Playwright provider (`@voidzero-dev/vite-plus-test`). We want the e2e suite (`tests/src/end-to-end`, 24 files / ~136 tests) to run under Vitest Browser Mode instead of standalone Playwright, so the whole test toolchain is unified under `vp test` (no separate preview server, no separate Playwright config/runner).

The fundamental shift: **today each test navigates to a built preview page** (`page.goto("http://localhost:3000/basic/testing?hideMenu")`), which requires building + serving the `playground` app on port 3000. **Vitest Browser Mode runs the test file _inside the browser_ and serves the test plus everything it imports through its own Vite dev server.** So instead of navigating to an example, each test **imports that example's `App` component and mounts it** — no preview server at all.

We are also removing the abandoned Playwright component-testing experiment (`tests/src/component`, the external copy/paste tests are explicitly flagged as not-yet-correct).

Decisions confirmed with the user: **full migration** (all 24 files); **migrate the 42 PNG visual snapshots to Vitest's `toMatchScreenshot`** (regenerate baselines); **keep all three browsers** (chromium, firefox, webkit) with the existing per-browser skips.

---

## The core mechanism: mounting instead of navigating

Each example's `examples/<group>/<name>/src/App.tsx` is a default-exported React component (`export default function App()`). The playground already loads these dynamically via `import.meta.glob` ([playground/src/main.tsx:22,119-130](playground/src/main.tsx#L22)). We do the same in tests, but with a static import + synchronous render:

```tsx
import { render } from "vitest-browser-react";
import App from "../../../../examples/01-basic/testing/src/App.js";

beforeEach(() => {
  render(<App />);
});
```

- `window.ProseMirror` (used by `getDoc`) is set by `useCreateBlockNote` ([useCreateBlockNote.tsx:30-33](packages/react/src/hooks/useCreateBlockNote.tsx#L30)), so it works for any mounted example.
- `?hideMenu` only hides the _playground_ shell ([playground/src/main.tsx:54,66](playground/src/main.tsx#L54)); mounting `App` directly means there is no shell, so the param is dropped entirely.
- The example→folder mapping (URL slug strips the numeric prefix), to replace every URL constant in [tests/src/utils/const.ts](tests/src/utils/const.ts):

| Old constant (slug)                                                   | Example `App` to import                              |
| --------------------------------------------------------------------- | ---------------------------------------------------- |
| `BASE_URL` `/basic/testing`                                           | `examples/01-basic/testing`                          |
| `SHADCN_URL` `/basic/shadcn`                                          | `examples/01-basic/09-shadcn`                        |
| `ARIAKIT_URL` `/basic/ariakit`                                        | `examples/01-basic/08-ariakit`                       |
| `MULTI_COLUMN_URL` `/basic/multi-column`                              | `examples/01-basic/03-multi-column`                  |
| `BASIC_BLOCKS_URL` `/basic/default-blocks`                            | `examples/01-basic/04-default-blocks`                |
| `NO_TRAILING_BLOCK_URL` `/basic/no-trailing-block`                    | `examples/01-basic/17-no-trailing-block`             |
| `AI_URL` `/ai/minimal`                                                | `examples/09-ai/01-minimal`                          |
| `STATIC_URL` `/backend/rendering-static-documents`                    | `examples/02-backend/04-rendering-static-documents`  |
| `BASIC_BLOCKS_STATIC_URL` `/interoperability/static-html-render`      | `examples/05-interoperability/10-static-html-render` |
| `CUSTOM_BLOCKS_REACT_URL` `/custom-schema/react-custom-blocks`        | `examples/06-custom-schema/react-custom-blocks`      |
| `ALERT_BLOCK_URL` `/custom-schema/alert-block`                        | `examples/06-custom-schema/01-alert-block`           |
| `NON_EDITABLE_BLOCK_URL` `/custom-schema/non-editable-block`          | `examples/06-custom-schema/08-non-editable-block`    |
| `PDF_FILE_BLOCK_URL` `/custom-schema/pdf-file-block`                  | `examples/06-custom-schema/04-pdf-file-block`        |
| `COMMENTS_URL` `/collaboration/comments-testing`                      | `examples/07-collaboration/09-comments-testing`      |
| `CUSTOM_BLOCKS_VANILLA_URL` `/vanilla-js/react-vanilla-custom-blocks` | `examples/vanilla-js/react-vanilla-custom-blocks`    |

> **tsconfig note:** statically importing `examples/**/App.tsx` pulls example sources into the tests' `tsc` build task ([tests/vite.config.ts:9-17](tests/vite.config.ts#L9)). Validate that the tests `tsconfig` `include`/references cover these (or add an `@examples/*` path alias). If type friction is excessive, fall back to the playground's `import.meta.glob(..., { import: "default" })` pattern in a small `loadExampleApp` helper.

---

## New dependencies (`tests/package.json`)

- **`vitest-browser-react`** — provides `render` (+ auto-cleanup between tests). Required; Vite Plus bundles the runner + Playwright provider but not a framework render helper. Use a Vitest-4-compatible version (add via the workspace `catalog:` like `vite-plus`).
- **`playwright`** — add explicitly. The provider runs `await import('playwright')` and bare `playwright` is **not** currently resolvable (only `@playwright/test` is). Pin to the existing `1.60.0`.
- **Remove** `@playwright/experimental-ct-react`. `@playwright/test` can also be removed once nothing imports from it (keep `playwright` only).

---

## Infrastructure changes

**1. New browser test project — `tests/vite.config.browser.ts`:**

```ts
import { defineConfig, type UserConfig } from "vite-plus";
import { playwright } from "vite-plus/test/browser/providers/playwright";
import { dragAndDropBlock, dragMouse } from "./src/end-to-end/commands"; // see step 3

export default defineConfig(
  (conf) =>
    ({
      test: {
        name: "e2e",
        include: ["./src/end-to-end/**/*.test.ts"],
        setupFiles: ["./vitestSetup.browser.ts"],
        browser: {
          enabled: true,
          provider: playwright(), // function call, NOT the string "playwright"
          headless: !!process.env.CI,
          commands: { dragAndDropBlock, dragMouse },
          expect: {
            toMatchScreenshot: {
              comparatorName: "pixelmatch",
              comparatorOptions: {
                threshold: 0.2,
                allowedMismatchedPixelRatio: 0.01,
              },
            },
          },
          instances: [
            { browser: "chromium" },
            { browser: "firefox" },
            { browser: "webkit" },
          ],
        },
        // reuse the dev-time resolve.alias for @blocknote/core + @blocknote/react -> src
      },
      resolve: {
        /* same alias block as tests/vite.config.ts */
      },
    }) as UserConfig,
);
```

**2. Register the project** in the root [vite.config.ts](vite.config.ts) `test.projects` array (alongside `"./tests/vite.config.ts"`): add `"./tests/vite.config.browser.ts"`. The existing `tests/vite.config.ts` jsdom project (unit tests) stays unchanged — browser instances and jsdom cannot share one `test` block, so they remain separate projects.

**3. Custom mouse commands — `tests/src/end-to-end/commands/` (run in Node, get the real Playwright `page`):**

Port [tests/src/utils/mouse.ts](tests/src/utils/mouse.ts) logic verbatim into commands that resolve selectors via `frame()` (its `boundingBox()` returns top-level-page coordinates, sidestepping iframe-offset math). Example:

```ts
import { defineBrowserCommand } from "vite-plus/test/browser/providers/playwright";

export const dragAndDropBlock = defineBrowserCommand<
  [dragSel: string, dropSel: string, dropAbove: boolean]
>(async ({ frame }, dragSel, dropSel, dropAbove) => {
  const f = await frame();
  const drag = f.locator(dragSel);
  const box = (await drag.boundingBox())!;
  // hover block -> drag handle appears -> drag handle center -> target left/right edge
  // (mirrors dragAndDropBlock in mouse.ts using context.page.mouse.move/down/up)
});
```

Augment the `BrowserCommands` interface (in `vitestSetup.browser.ts` or a `.d.ts`) so `server.commands.dragAndDropBlock(...)` is typed. Call from tests via `import { server } from "vite-plus/test/browser/context"`.

**4. Browser setup file — `tests/vitestSetup.browser.ts`:** sets `window.__TEST_OPTIONS` per test (replacing the Playwright init-script in [tests/src/setup/setupScript.ts](tests/src/setup/setupScript.ts)) and the command type augmentation. Drop the jsdom-only mocks (`ClipboardEvent`/`DragEvent`/`matchMedia`) — the real browser provides them; those stay in the existing [tests/vitestSetup.ts](tests/vitestSetup.ts) for the unit project.

---

## Rewrite shared utilities (`tests/src/utils/`)

All helpers currently take `page: Page` and use the Playwright API. Rewrite them to use the global Vitest browser context (`page`, `userEvent`, `server` from `vite-plus/test/browser/context`) — they no longer need a `page` argument. The biggest simplification: **the test runs in the browser**, so `window`/`document` are directly accessible.

| Util                                                                             | Today (Playwright)                                     | After (Vitest browser)                                                                                                                      |
| -------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `editor.ts` `getDoc`                                                             | `page.evaluateHandle` → `window.ProseMirror.getJSON()` | `(window as any).ProseMirror.getJSON()` directly                                                                                            |
| `editor.ts` `compareDocToSnapshot`                                               | `expect(doc).toMatchSnapshot("x.json")`                | `expect(docStr).toMatchFileSnapshot(\`**snapshots**/${name}-${server.browser}.json\`)` (browser name in filename for per-browser baselines) |
| `editor.ts` `focusOnEditor` / `waitForSelectorInEditor`                          | `page.waitForSelector`/`click`                         | `await vi.waitFor(() => document.querySelector(".bn-editor"))`; `await userEvent.click(el)`; `await expect.element(...).toBeVisible()`      |
| `mouse.ts`                                                                       | `page.mouse.move/down/up`, `locator.boundingBox()`     | thin wrappers calling `server.commands.dragAndDropBlock(...)` / `dragMouse(...)`; coord math moves into the command                         |
| `copypaste.ts` `copyPaste`                                                       | `page.keyboard` Ctrl+C/V                               | `userEvent.copy()` / `userEvent.paste()` (or `userEvent.keyboard("{Control>}c{/Control}")`)                                                 |
| `copypaste.ts` `copyPasteAllExternal(os)`                                        | passed `os`                                            | `server.platform` (external tests removed anyway — see below)                                                                               |
| `slashmenu.ts` / `draghandle.ts` / `emojipicker.ts`                              | `page.keyboard.press`, `page.waitForSelector`          | `userEvent.keyboard`, `vi.waitFor` / `expect.element(...)`                                                                                  |
| `const.ts`                                                                       | URL constants + selectors                              | drop URL constants; keep CSS selector constants + `TYPE_DELAY`                                                                              |
| pure helpers (`removeAttFromDoc`, `removeClassesFromHTML`, `removeMetaFromHTML`) | —                                                      | keep as-is                                                                                                                                  |

---

## Per-test conversion pattern (×24 files)

Standard transformation per `*.test.ts`:

- **Imports:** replace `import { expect } from "@playwright/test"` + `import { test } from "../../setup/setupScript.js"` with `import { test, expect, beforeEach, vi } from "vite-plus/test"`, `import { userEvent, page, server } from "vite-plus/test/browser/context"`, `import { render } from "vitest-browser-react"`, and the example `App` import.
- **Setup:** `test.beforeEach(async ({ page }) => { await page.goto(URL) })` → `beforeEach(() => { render(<App />); })`. Drop the `{ page }` fixture from every test signature (use the global `page`).
- **API translation:**
  - `page.locator(css)` / queries → `document.querySelector(css)` (in-browser) or `page.elementLocator(el)`; `userEvent`/`expect.element` accept raw `Element`.
  - `page.keyboard.insertText/type/press` → `userEvent.keyboard(...)` (testing-library syntax: `{Enter}`, `{Shift>}{ArrowUp}{/Shift}`, etc.).
  - `element.boundingBox()` → `el.getBoundingClientRect()`.
  - `page.waitForSelector` / `locator.waitFor` → `vi.waitFor(...)` or `await expect.element(locator).toBeVisible()`.
  - `page.evaluate(fn)` → run the code directly (already in browser).
  - `expect(await el.textContent()).toBe(x)` → `await expect.element(page.elementLocator(el)).toHaveTextContent(x)`.
  - file upload (`page.on("filechooser")`, images tests) → `userEvent.upload(inputEl, file)`.
  - `test.use({ viewport })` (ai.test.ts) → `page.viewport(w, h)` in `beforeEach`.
- **Per-browser skips:** `test.skip(browserName === "firefox", ...)` → `test.skipIf(server.browser === "firefox")(...)`. Note copy/paste + `cdp()` are Chromium-only, matching existing skips.

---

## Snapshots

- **JSON doc snapshots (82 uses of `compareDocToSnapshot`):** → `toMatchFileSnapshot`, embedding `server.browser` in the filename for per-browser baselines. Regenerate with the Vitest update flag.
- **PNG visual snapshots (42 uses across 11 files):** `expect(await page.screenshot()).toMatchSnapshot("x.png")` → `await expect.element(locator).toMatchScreenshot("x")`. Vitest auto-appends `-${browserName}-${platform}` to baseline filenames (default dir `__screenshots__/<testFileName>/`). All baselines must be regenerated (Vitest screenshots differ from the old Playwright/Docker PNGs).
- **Regeneration must run in Docker** for cross-platform/CI consistency, mirroring the current `test:updateSnaps` Docker flow ([tests/package.json](tests/package.json)) — replace it with a Docker invocation of `vp test --project e2e -u` (headless). Old `*.test.ts-snapshots/` dirs are replaced by the new Vitest snapshot locations.

---

## Removals

- Delete `tests/src/component/` entirely (incl. `snapshots/`) — the half-baked Playwright CT experiment (external tests carry an explicit "not the output we want" TODO).
- Delete `tests/playwright.config.ts`, `tests/playwright-ct.config.ts`, `tests/src/setup/setupScript.ts`, `tests/src/setup/setupScriptComponent.ts`.
- `tests/package.json` scripts: remove `playwright`, `test-ct`, `test-ct:updateSnaps`; rework `test:updateSnaps` to the Docker `vp test -u` flow. The `test` script (`vp test --run`) now runs jsdom unit + browser e2e projects.
- Root [package.json](package.json): drop the `e2e`/`e2e:updateSnaps` `concurrently "vp run start" + wait-on :3000 + playwright` orchestration — replace with `vp test --project e2e` (no preview server). Keep an `install-playwright` step (`playwright install --with-deps`).

---

## Order of operations

1. Add deps (`vitest-browser-react`, `playwright`); remove CT dep.
2. Add `tests/vite.config.browser.ts` + register in root `test.projects`; add `vitestSetup.browser.ts`.
3. Implement the `commands/` mouse commands + type augmentation.
4. Rewrite `tests/src/utils/*` to the browser context API.
5. Convert one representative file first (`basics/basics.test.ts`, then `draghandle/draghandle.test.ts` to exercise drag + visual snapshots) to validate the whole chain end-to-end before batch-converting.
6. Convert remaining files; replace URL constants with example imports.
7. Delete component tests + Playwright configs/setup; clean scripts.
8. Regenerate all snapshots (JSON + screenshots) in Docker; commit baselines.

---

## Verification

- `cd tests && vp test --project e2e` — runs the full e2e suite headless across chromium/firefox/webkit, with **no preview server running**. Confirms mounting + interactions + commands work.
- `vp test` from repo root — both the jsdom unit project and the browser e2e project run and pass.
- Spot-check a visual test (`theming`/`colors`/`slashmenu`) produces a `__screenshots__/...-<browser>-<platform>.png` baseline and re-runs green.
- Spot-check a drag test (`draghandle`) to confirm the `dragAndDropBlock` command drives the real Playwright mouse correctly through the test iframe.
- Confirm the AI test's `window.__TEST_OPTIONS.mockID` is set by the browser setup file before render.
- Grep confirms zero remaining imports from `@playwright/test`, `@playwright/experimental-ct-react`, or `../../setup/setupScript`.

---

## Implementation status (what was actually done)

**Done & statically verified** (`tsc --noEmit` 0 errors, `vp lint src` 0 errors):

- Browser project `tests/vite.config.browser.ts` (provider `playwright({ launchOptions: { args: ["--no-sandbox", "--disable-setuid-sandbox"] } })`, 3 instances, `optimizeDeps.exclude: ["fsevents"]`), registered in root `vite.config.ts` `test.projects`.
- `tests/vitestSetup.browser.ts` (seeds `window.__TEST_OPTIONS`).
- `tests/src/end-to-end/commands/playwrightMouse.ts` — the low-level mouse command (resolves the iframe offset via Playwright `frame()`).
- `tests/src/utils/context.ts` — **adapter for this vite-plus build**: the browser-context runtime exports `createUserEvent` (factory), `page`, `cdp`, `locators`, `utils` — _not_ the `userEvent`/`server`/`commands` its `.d.ts` advertises. So `context.ts` builds `userEvent = createUserEvent()`, derives `MOD`/`browserName` from `navigator`, and triggers commands via `window.__vitest_browser_runner__.commands.triggerCommand`.
- All other utils rewritten (`editor`, `mouse`, `copypaste`, `slashmenu`, `emojipicker`, `draghandle`, `keyboard`, `render`, `const`).
- All **24** e2e files converted to `.test.tsx` mounting example `App`s. Component tests, both Playwright configs, `src/setup/*`, and orphaned `*.test.ts-snapshots/` dirs removed. Scripts updated: `tests` → `test:e2e` / `test:e2e:updateSnaps`; root `e2e` → `vp run -r build && cd tests && vp test -c vite.config.browser.ts --run`.
- Shims: `tests/src/examples.d.ts` (`@examples/*` → React component) and `tests/src/vitest-browser.d.ts` (declares the runtime `createUserEvent`).

**NOT validated at runtime here:** This assistant sandbox cannot complete a Vitest Browser Mode run — even a trivial test fails with _"Browser connection was closed while running tests / Was the page closed unexpectedly?"_ (the headless page dies before the runner initializes). This is environmental; browser tests run fine on the user's machine/CI. **Validate with `cd tests && pnpm test:e2e` (or `pnpm e2e` from root), then `pnpm test:e2e:updateSnaps` to generate baselines** (do snapshot generation in Docker for cross-platform/CI parity).

**Gotchas worth knowing when validating:**

- Test discovery only matches `**/*.test.tsx` (recursive glob). Files must live in a subdirectory (not directly under `end-to-end/`) and must not be underscore-prefixed.
- Cold dep-optimization is slow on first run (heavy `@mantine` graph); it caches afterward. Don't mistake a slow first run for a hang.
- Example apps load from **built `dist`** (no source aliases) — that's why `e2e` builds first.

**Known limitations / TODOs left in code (search `TODO(migration)` / `NOTE:`):**

1. `theming/theming.test.tsx` — the old `test.use({ colorScheme: "dark" })` has no per-test equivalent in this Vitest browser build; the dark-theme screenshot won't render dark until colorScheme emulation is wired up.
2. `static/static.test.tsx` — `matchPageScreenshot` doesn't expose Playwright's `mask` / `maxDiffPixels`, so the original media-masking + 200px tolerance aren't applied; may be flaky until the helper is extended.
3. `images/images.test.tsx` upload test is `test.skip` (file-path upload → `userEvent.upload` with a placeholder `File`).
4. `comments/comments.test.tsx` popup assertion reimplemented via `vi.spyOn(window, "open")`.
5. `@playwright/test` left as a devDependency (harmless; only `playwright` is required by the provider) — can be removed.
