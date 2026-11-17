# React component testing

Use a browser when testing clicks, keyboard navigation, focus, or other rendering-dependent behavior. Keep logic that does not need rendering in faster Node tests.

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

Destructure typed helpers from the test context. Find the current listing in [`tests/src/commands/index.ts`](../../../../tests/src/commands/index.ts) and usage documentation beside each implementation. The browser setup supplies the extended global `it`.

```tsx
const { editor } = await setupEditor({
  initialContent: [{ type: "paragraph", content: "Selected text" }],
  props: { formattingToolbar: false },
  children: <BasicTextStyleButton basicTextStyle="bold" />,
});
selectText(editor, "Selected text");
```

Render the component directly with unrelated default UI disabled, rather than navigating a parent merely to reach it. Use the actual control for the action under test; editor APIs may establish the initial state.

Shared rendering handles StrictMode, initial commit, fonts, and cleanup. Wait for later selection-driven UI explicitly. Skin selection defaults to Mantine and loads lazily; loaded CSS remains, so prefer one skin per file.

Prefer accessible locators using dictionary labels. Direct focus is valid setup; use real Tab input when traversal is the contract. Wait for observable readiness: a menu can be visible before it receives focus.

## Accessibility assertions

- Assert focus with `toHaveFocus()` and check each owned control's indicator independently.
- Scope accessible-state assertions to the control/popup. Use built-in `toMatchAriaInlineSnapshot` / `toMatchAriaSnapshot` for standalone trees.
- For container traversal, an ordered sequence of focused controls' trees can detect skipped controls or changed order. Assert that focus can leave the container without prescribing an unrelated next destination.
- Scan closed triggers and open UI as applicable. Assert returned axe `violations`; for known issues, match their precise violation/check shapes with an issue link so additional violations fail. Do not mark a whole axe journey `it.fails`.
- ARIA trees, axe, keyboard checks, and visual checks complement each other; none proves actual reader speech.

## Native screen readers

Use colocated `*.screen-reader.test.ts` for real speech/navigation that browser assertions cannot establish. Register cleanup so the reader stops on failure; consult the command implementations for usage.

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
