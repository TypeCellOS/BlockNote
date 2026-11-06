# Colocated component and accessibility tests

All paths below are relative to the repository root. These are browser integration tests, even though their filenames end in `.test.ts`. They use the existing e2e configuration and CI jobs, not a separate accessibility browser project or workflow.

## Files and fixtures

Place files directly beside the component or block:

```text
FormattingToolbar.tsx
FormattingToolbar.test.ts
FormattingToolbar.screen-reader.test.ts  # optional, native/local only
testHelpers.ts                          # shared navigation, when needed
__snapshots__/                          # ARIA snapshots
__screenshots__/                        # browser-specific visual baselines
```

Examples to read before extending an area:

- `packages/react/src/components/FormattingToolbar/FormattingToolbar.test.ts`
- `packages/react/src/editor/BlockNoteView.test.ts`
- `packages/core/src/blocks/Heading/block.test.ts`

Keep the browser scenarios in one file, grouped by assertion purpose. Do not split them into `.keyboard.test.ts`, `.aria.test.ts`, `.axe.test.ts`, or `.visual.test.ts` files or put them in a component-local `a11y/` directory. Only add groups relevant to the component.

Declare document fixtures in their consuming test files, with names ending in `Document` and typed as `PartialBlock[]`. Prefer plain data; avoid fixture-selection factories and separate `fixtures.ts` files. If both browser and screen-reader tests need a small fixture, declare it in each file rather than importing one test file from another. The common schema examples in `tests/a11y/documents.ts` remain shared infrastructure for broad editor coverage.

Write explicit named tests for each toolbar item. Share repeated test logic through named functions near the start of the file or describe block, rather than registering all item tests in a loop. Use specific names such as `toolbarButton`, `toolbarMenu`, and `toolbarItem`, rather than `control`.

## Describe blocks and assertion scope

The same keyboard actions may appear in several groups. Each group checks a different outcome; avoid adding every kind of assertion to every test.

| Group      | Actions and assertions                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `behavior` | Navigate using the keyboard and activate with Enter. Assert the component's functional effect. For document edits, subscribe with `editor.onChange(vi.fn())` after navigation and before activation, register the unsubscribe with `onTestFinished`, and assert the callback ran. View-only changes may need another observable effect: toggle-heading tests check persisted expansion state. Keep detailed editor-command unit tests colocated with those commands rather than duplicating them here. |
| `keyboard` | Assert the relevant focus transitions explicitly with `toHaveFocus()`: entering the editor, reaching the toolbar/menu/item, and returning to the editor or leaving it. Assert visibility and, for document traversal, selection/block/table-cell changes using `readSelection()`. Check the visual focus indicator as well; DOM focus alone does not prove that focus is visible.                                                                                                                      |
| `ARIA`     | Follow the keyboard interaction and use `checkAriaSnapshot(locator, name)` before and after activation to check names, roles, pressed/expanded state, etc. Scope item tests to the item: adding another toolbar button must not invalidate Bold's snapshots. Use a separate whole-toolbar tree snapshot to cover membership and overall structure. If activation changes the item's accessible name, locate its resulting name explicitly.                                                             |
| `axe`      | Open the relevant UI state and call `checkAxe(annotate, scope)`. Scan a toolbar, menu, or popover independently where appropriate; use a whole-document scan for broad schema coverage. The helper asserts no violations and annotates incomplete results for manual review. Axe scans do not replace keyboard navigation or focus-indicator checks.                                                                                                                                                   |
| `visual`   | Cover visual accessibility scenarios such as text-spacing overrides and 200% text resizing. Use `screenshotFull` for tall documents, wait for fonts/media, and mask nondeterministic video frames where needed. These checks concern layout/readability rather than individual button activation.                                                                                                                                                                                                      |

On `a11y-testing`, keyboard focus appearance is currently checked with item-level screenshots. FormattingToolbar's `checkScreenshotWithPadding` captures the item plus 2 px on each side so its focus ring is not clipped; avoid whole-toolbar screenshots for individual buttons. Keep visual-indicator assertions separate from navigation's `toHaveFocus()` assertions. Follow the checked-out branch's implementation when changing this mechanism; do not assume newer helpers from another branch exist.

## Helpers and synchronization

Import the common harness from `@root/tests/a11y/helpers.js`:

- `openEditor(document, { editable, theme, onReady }?)` mounts the editor and surrounding "Before editor" / "After editor" buttons, waits for readiness, and returns the editor. Normal browser runs start focused on "Before editor"; native screen-reader runs start the reader.
- `pressKey(key)` sends real keyboard input through the browser provider and waits for pending editor focus reconciliation before the next key. Use `selectToLineEndKey` for platform-appropriate selection.
- `readSelection()` exposes block ID, table-cell coordinates, offset, and selected text for navigation assertions.
- `checkAriaSnapshot(locator, name)` captures the scoped browser accessibility tree into Vitest snapshots.
- `checkAxe(annotate, scope?)` runs axe with optional CSS scope and reports violations/incomplete results.
- `saveTranscript()` captures a native reader transcript and stops the reader in `finally`; register it with `afterEach` in screen-reader files.

Keep reusable multi-step navigation in the colocated `testHelpers.ts`, such as `focusToolbarItem`, `focusToggleHeading`, or `navigateDefaultSchemaDocument`. Keep behavior assertions out of those action helpers. The keyboard group's corresponding `...WithAssertions` function follows the same navigation steps, adding focus/visibility/selection assertions. Inline trivial one- or two-line wrappers around `pressKey`, storage resets, or element lookup. Avoid generic setup helpers that mix fixture choice, navigation, and spying.

Navigate to a requested item by advancing with keyboard input until that item has focus, with the test timeout bounding failure. Do not maintain a duplicate list of enabled toolbar buttons or calculate a fixed number of Tab presses. Use accessible locators (`getByRole` with a name, `getByLabel`) where available.

Wait on observable readiness with retrying assertions, not arbitrary sleeps. This also applies outside the keyboard group when needed to drive the next action reliably. For example, Mantine asynchronously focuses a `[data-autofocus]` placeholder after opening a menu: wait for menu visibility, then assert that placeholder has focus before sending ArrowDown. Visibility alone is not enough. Prefer these explicit assertions to `vi.waitUntil` polling for focus. Use live locators for asynchronously mounted elements; passing the result of an early `document.querySelector()` to an assertion can permanently capture `null`.

## Native screen-reader edge cases

Use a separate `*.screen-reader.test.ts` only for actual reader announcements/navigation that ARIA snapshots cannot establish. Reuse keyboard navigation helpers, call `openEditor`, and register `afterEach(saveTranscript)`. Avoid duplicating every browser scenario. Transcripts are reader-specific; review changes rather than accepting them blindly.

These tests run locally with VoiceOver on macOS or NVDA on Windows and require the installed reader and GuidePup permissions. They must stay excluded from regular e2e, node tests, and CI. `tests/a11y/vite.config.ts` is for this native runner only.

## Discovery and commands

The colocated `.test.ts` browser files are explicitly registered. When adding an area, update:

- `tests/vite.config.browser.ts`: include its browser test in the shared e2e suite; preserve the screen-reader exclusions, including desktop instance exclusions.
- The package's `vite.config.ts`: exclude the browser test from node/jsdom unit runs.
- The package's `tsconfig.json` and `tests/a11y/tsconfig.json`: keep test-only files/helpers out of production declarations and include them in the accessibility type-check project.
- Root `vite.config.ts`: extend the accessible-locator lint override for the new test files where necessary.
- `tests/a11y/run.mjs`: add the area's browser test to the default filters for the `a11y` shortcut.

Run from the repository root:

```bash
# Existing e2e suite, always Docker; narrow by file, group, and/or browser.
vp run e2e FormattingToolbar.test.ts
vp run e2e FormattingToolbar.test.ts -t keyboard --project "e2e (webkit)" --retry=0
vp run a11y

# Update only the selected suite, then review and rerun without updating.
vp run e2e:updateSnaps FormattingToolbar.test.ts

# Native/local only, never part of regular e2e or CI.
vp run a11y:screen-reader FormattingToolbar.screen-reader.test.ts
```

Keep known functionality gaps skipped with a brief comment explaining the actual failure. Use `test.skipIf(server.browser === "webkit")`, for example, when only that browser is affected, preserving other browsers' coverage. Do not skip timing failures or increase retries to hide them: fix readiness/locator handling and verify repeated runs with retries disabled. Do not refresh snapshots to accept an unexplained regression.
