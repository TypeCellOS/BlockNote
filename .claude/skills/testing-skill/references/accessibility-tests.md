# Colocated component and accessibility tests

All paths below are relative to the repository root. These are browser integration tests, identified by the `.browser.test.ts` or `.browser.test.tsx` suffix. They use the existing e2e configuration and CI jobs, not a separate accessibility browser project or workflow.

## Files and fixtures

Place files directly beside the component or block:

```text
FormattingToolbar.tsx
FormattingToolbar.browser.test.tsx
FormattingToolbar.screen-reader.test.ts  # optional, native/local only
__snapshots__/                          # ARIA snapshots
__screenshots__/                        # browser-specific visual baselines
```

Examples to read before extending an area:

- `packages/react/src/components/FormattingToolbar/FormattingToolbar.browser.test.tsx`
- `packages/react/src/editor/BlockNoteView.browser.test.tsx`
- `packages/core/src/blocks/Heading/block.browser.test.tsx`

Keep the browser scenarios in one file, grouped by assertion purpose. Do not split them into `.keyboard.test.ts`, `.aria.test.ts`, `.axe.test.ts`, or `.visual.test.ts` files or put them in a component-local `a11y/` directory. Only add groups relevant to the component.

Declare document fixtures in their consuming test files, with names ending in `Document` and typed as `PartialBlock[]`. Prefer plain data; avoid fixture-selection factories and separate `fixtures.ts` files. If browser and screen-reader tests share a fixture or helper, export it from the owning test file and import it in the other. Guard browser suite registration with `if (!screenReader)` when the native suite imports that file, so importing helpers does not collect browser scenarios in the native run.

Write explicit named tests for each toolbar item. Share repeated test logic through named functions near the start of the file or describe block, rather than registering all item tests in a loop. Use specific names such as `toolbarButton`, `toolbarMenu`, and `toolbarItem`, rather than `control`.

## Describe blocks and assertion scope

The same keyboard actions may appear in several groups. Each group checks a different outcome; avoid adding every kind of assertion to every test.

| Group      | Actions and assertions                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `behavior` | Navigate using the keyboard and activate with Enter. Assert the component's functional effect. For document edits, subscribe with `editor.onChange(vi.fn())` after navigation and before activation, register the unsubscribe with `onTestFinished`, and assert the callback ran. View-only changes may need another observable effect: toggle-heading tests check persisted expansion state. Keep detailed editor-command unit tests colocated with those commands rather than duplicating them here. |
| `keyboard` | Assert the relevant focus transitions explicitly with `toHaveFocus()`: entering the editor, reaching the toolbar/menu/item, and returning to the editor or leaving it. Assert visibility and, for document traversal, selection/block/table-cell changes through the selection command. Check the visual focus indicator as well; DOM focus alone does not prove that focus is visible.                                                                                                                |
| `ARIA`     | Follow the keyboard interaction and compare named ARIA snapshots before and after activation to check names, roles, pressed/expanded state, etc. Scope item tests to the item: adding another toolbar button must not invalidate Bold's snapshots. Use a separate whole-toolbar tree snapshot to cover membership and overall structure. If activation changes the item's accessible name, locate its resulting name explicitly.                                                                       |
| `axe`      | Open the relevant UI state and run the axe command. Scan a toolbar, menu, or popover independently where appropriate; use a whole-document scan for broad schema coverage. Attach the returned manual-review warnings to the test. Axe scans do not replace keyboard navigation or focus-indicator checks.                                                                                                                                                                                             |
| `visual`   | Cover visual accessibility scenarios such as text-spacing overrides and 200% text resizing. Use `screenshotFull` for tall documents, wait for fonts/media, and mask nondeterministic video frames where needed. These checks concern layout/readability rather than individual button activation.                                                                                                                                                                                                      |

## Test setup and commands

Define a local `TestEditor` component using `useCreateBlockNote` and `BlockNoteView`. Use `.tsx` and JSX when rendering React components. Add a `renderTestEditor` function when the suite needs repeated rendering or readiness steps. Keep document data, initial focus, and setup specific to the scenario; do not introduce a shared editor fixture for unrelated suites.

Consume browser operations through the typed `commands` export in `tests/src/utils/context.ts`. The implementations live in `tests/src/utils/accessibility.ts` and `tests/src/utils/keyboard.ts`; their JSDoc describes inputs, results, synchronization, and usage. Register new reusable browser operations in the relevant Vite configuration and add their client signatures to `context.ts`. Do not import command implementations into tests, add per-caller type casts, or wrap a command just to forward its arguments.

Keep scenario-specific sequences, such as navigating to a toolbar item, in the consuming test file. Share them only where another test actually needs the same sequence. Keep action sequences separate from behavior assertions; keyboard tests should explicitly assert the focus and selection transitions they cover.

The default browser setup already disables motion and tracks ProseMirror focus reconciliation. Do not duplicate those mechanisms in fixtures. Wait for observable readiness with retrying assertions instead of arbitrary sleeps. For example, an opened menu can be visible before its initial item receives focus: assert that focus before sending navigation keys.

Use accessible locators (`getByRole` with a name or `getByLabel`) and pass their selectors to commands. Prefer live locators for asynchronously mounted elements. When tabbing to an item, advance until the target has focus, bounded by the test timeout, rather than maintaining a duplicate list of controls or a fixed Tab count.

## Native screen-reader edge cases

Use a separate `*.screen-reader.test.ts` only for actual reader announcements/navigation that ARIA snapshots cannot establish. Reuse keyboard navigation helpers, render the suite’s editor and call `commands.startReader(locator.selector)`, and assert the transcript and stop the reader in `afterEach`. Avoid duplicating every browser scenario. Transcripts are reader-specific; review changes rather than accepting them blindly.

These tests run locally with VoiceOver on macOS or NVDA on Windows and require the installed reader and GuidePup permissions. They must stay excluded from regular e2e, node tests, and CI. `tests/screen-reader/vite.config.screen-reader.ts` is for this native runner only.

## Discovery and commands

Browser files use `*.browser.test.ts` (or `.tsx`); native screen-reader tests use `*.screen-reader.test.ts`; node tests use `*.test.ts`. Existing glob patterns discover browser tests and exclude them from node runs without per-file configuration. Accessibility checks are part of the regular suite. Production files must not import test files; lint enforces this boundary.

Run from the repository root:

```bash
# Existing e2e suite, always Docker; narrow by file, group, and/or browser.
vp run e2e FormattingToolbar.browser.test.tsx
vp run e2e FormattingToolbar.browser.test.tsx -t keyboard --project "e2e (webkit)" --retry=0

# Update only the selected suite, then review and rerun without updating.
vp run e2e:updateSnaps FormattingToolbar.browser.test.tsx

# Native/local only, never part of regular e2e or CI.
vp run test:screen-reader FormattingToolbar.screen-reader.test.ts
```

Evaluate known functionality gaps individually; any intentional skip needs a comment explaining the specific failure. Do not skip timing failures or increase retries to hide them: fix readiness/locator handling and verify repeated runs with retries disabled. Do not refresh snapshots to accept an unexplained regression.
