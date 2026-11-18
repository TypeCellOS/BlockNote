# React component testing

Use a browser for rendered component interactions, actual keyboard traversal/focus, or other rendering-dependent behavior. Test editor keyboard shortcut handlers in Node/jsdom: set state and selection with editor APIs, then dispatch the event. This avoids brittle layout-dependent navigation; use a browser only when browser behavior is the contract. A shared shortcut-event helper is planned.

## Component structure

Keep behavior and accessibility in one colocated `<Owner>.browser.test.{ts,tsx}` file. Use an owner-named outer `describe`, then applicable groups in order:

| Group         | Assert                                                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `unit`        | The owner's decisions: visibility, schema support, composition, callbacks.                                               |
| `integration` | Subsystems working together: an actual control updates the editor correctly.                                             |
| `keyboard`    | Activation, traversal, dismissal, focus destination, visible focus.                                                      |
| `a11y`        | Names, roles, relationships, pressed/expanded/checked state; axe scans in relevant states, including open menus/dialogs. |

Cover relevant categories reasonably, not every possible combination. A child owns its interaction and focus indicator; a container owns composition, traversal, and exit. ARIA assertions and axe scans share `a11y`.

## Setup

Destructure typed helpers from the test context. The [Node fixtures](../../../../tests/src/fixtures/editor.node.ts) provide the baseline editor/document helpers. The [browser fixtures](../../../../tests/src/fixtures/editor.tsx) inherit them, override editor setup with rendering, and add the [browser helpers](../../../../tests/src/commands/index.ts). The browser setup supplies the extended global `it`. Usage documentation lives beside each implementation; Node-only Playwright/CDP transport handlers are registered separately.

```tsx
const { editor } = await setupEditor({
  initialContent: [{ type: "paragraph", content: "Selected text" }],
  props: { formattingToolbar: false },
  children: <BasicTextStyleButton basicTextStyle="bold" />,
});
selectText(editor, "Selected text");
```

Render the component directly with unrelated default UI disabled, rather than navigating a parent merely to reach it. Use the actual control for the action under test; editor APIs may establish the initial state.

Use BlockNote APIs for that setup instead of equivalent ProseMirror operations. Do not access `editor._tiptapEditor`; use `editor.prosemirrorView` when necessary and prefer `editor.transact` over `editor.prosemirrorState` for reads and transactions. See the [editor setup rules](../SKILL.md#editor-setup) for block-to-node conversion.

Shared rendering handles StrictMode, initial commit, fonts, and cleanup. Wait for later selection-driven UI explicitly. Skin selection defaults to Mantine and loads lazily; loaded CSS remains, so prefer one skin per file.

Prefer accessible locators using dictionary labels. Direct focus is valid setup; use real Tab input when traversal is the contract. Wait for observable readiness: a menu can be visible before it receives focus.

Stop navigation as soon as its target is reached and bound repeated keypresses explicitly; fail with the target and limit rather than waiting for a test timeout. `focusUntil` also detects cycles, stalled focus, and document boundaries.

Browser and screen-reader files enforce focused-test, assertion, awaited-poll, floating-promise, command-import, accessible-locator, and explicit-sleep safeguards. The component examples additionally enforce the scoped structure and timer conventions; do not weaken the shared safeguards when extending those rules.

## Accessibility assertions

- Assert focus with `toHaveFocus()` and check each owned control's indicator independently.
- Scope accessible-state assertions to the control/popup. Use built-in `toMatchAriaInlineSnapshot` / `toMatchAriaSnapshot` for standalone trees.
- For container traversal, an ordered sequence of focused controls' trees can detect skipped controls or changed order. Assert that focus can leave the container without prescribing an unrelated next destination.
- Scan closed triggers and open UI as applicable. Assert returned axe `violations`; for known issues, match their precise violation/check shapes with an issue link so additional violations fail. Do not mark a whole axe journey `it.fails`.
- ARIA trees, axe, keyboard checks, and visual checks complement each other; none proves actual reader speech.

## Native screen readers

Use colocated `*.screen-reader.test.ts` for real speech/navigation that browser assertions cannot establish. The native runner installs global `it` from `tests/src/fixtures/editor.screen-reader.ts`; this extends the browser fixtures with `setupScreenReader`, which is not available in ordinary browser tests. The two runners have separate global-type configurations. `const { getTranscript, pressKey } = await setupScreenReader(locator)` starts a session with automatic cleanup, including on failure. The locator is optional when focus is already established. Use the session's `pressKey` to capture speech, not the ordinary keyboard fixture.

This operates the real desktop using VoiceOver/NVDA and GuidePup permissions. Run only as intentional native verification, outside browser CI:

```bash
vp run test:screen-reader FormattingToolbar.screen-reader.test.ts
```

Configuration: `tests/src/screen-reader/vite.config.screen-reader.ts`.

## Mobile and visual checks

- Mobile-emulated tests cover mobile-specific behavior, not duplicate desktop contracts. Do not use `screenshotFull` in Android-instance tests: its iframe resize drops touch emulation for subsequent tests.
- State the limit when emulation cannot reproduce the OS behavior. Real-device suite is parked on `mobile/emulator-layer` (PR #3034).
- Tall screenshots need `tests/src/utils/screenshotFull.ts`: ordinary iframe screenshots can silently clip below the fold; viewport resizing alone can scale the capture.
- Screenshot baselines are browser/Linux-specific. Update in Docker with `--update=true`. Changes within pixel tolerance may leave a stale baseline; remove the specific baseline first when a fresh capture is required.
