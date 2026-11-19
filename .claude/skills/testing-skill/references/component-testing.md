# React component testing

Use a browser for rendered component interactions, keyboard traversal/focus, and browser APIs. Follow the [test-placement rules](../SKILL.md#decide-where-to-test); do not introduce jsdom in new files.

## Component structure

Keep behavior and accessibility in one colocated `<Component>.browser.test.{ts,tsx}` file. Use a component-named outer `describe`, then applicable groups in this order; omit irrelevant groups:

| Group         | Assert                                                                                                                        |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `unit`        | Behavior owned by the component, not its dependencies or how its parent uses it.                                              |
| `integration` | Interactions with other components or subsystems, such as an actual control updating the editor.                              |
| `aria`        | ARIA attributes and behaviors: names, roles, relationships, pressed/expanded/checked state, and accessibility-tree snapshots. |
| `axe`         | Automated axe scans and violations in relevant states, including open menus/dialogs.                                          |
| `keyboard`    | Functionality through keyboard input: activation, traversal, dismissal, focus destination, and visible focus.                 |

Cover relevant categories reasonably, not every possible combination. A child owns its interaction and focus indicator; a container owns composition, traversal, and exit.

Group tests by their primary contract; do not repeat a scenario merely to populate another group. Keyboard tests can also assert ARIA state or editor changes. An accessibility-tree snapshot recording keyboard traversal belongs in `keyboard`; a standalone ARIA-state snapshot belongs in `aria`.

## Setup

Destructure typed helpers from the extended global `it` context. The [browser fixtures](../../../../tests/src/fixtures/editor.tsx) provide editor setup and interaction helpers; usage documentation lives beside the implementations linked from the [fixture definitions](../../../../tests/src/commands/index.ts).

```tsx
import { BasicTextStyleButton } from "@blocknote/react";
import { expect } from "vite-plus/test";

it("reflects bold state after activation", async ({
  setupEditor,
  selectText,
  page,
}) => {
  const { editor } = await setupEditor({
    initialContent: [{ type: "paragraph", content: "Selected text" }],
    props: { formattingToolbar: false },
    children: <BasicTextStyleButton basicTextStyle="bold" />,
  });
  selectText(editor, "Selected text");
  const button = page.getByRole("button", {
    name: editor.dictionary.formatting_toolbar.bold.tooltip,
    exact: true,
  });
  await expect.element(button).toHaveAttribute("aria-pressed", "false");

  await button.click();

  await expect.element(button).toHaveAttribute("aria-pressed", "true");
});
```

Render the component directly with unrelated default UI disabled, rather than navigating a parent merely to reach it. Use the actual control for the action under test; editor APIs may establish the initial state.

Follow the [public-editor-API rules](../SKILL.md#rules) when establishing state.

Shared rendering handles StrictMode, initial commit, fonts, and cleanup. Wait for later selection-driven UI explicitly. Skin selection defaults to Mantine and loads lazily; loaded CSS remains, so prefer one skin per file.

Prefer accessible locators using dictionary labels. Direct focus is valid setup; use real Tab input when traversal is the contract. Wait for observable readiness: a menu can be visible before it receives focus.

Stop navigation as soon as its target is reached and bound repeated keypresses explicitly; fail with the target and limit rather than waiting for a test timeout. `focusUntil` also detects cycles, stalled focus, and document boundaries.

## Accessibility assertions

- Assert focus with `toHaveFocus()`. Check each owned control's indicator independently: capture its unfocused appearance with `const compareFocusOutline = captureFocusOutline(control)`, move focus through keyboard input, then `await compareFocusOutline()`.
- Scope accessible-state assertions to the control/popup. Use built-in `toMatchAriaInlineSnapshot` / `toMatchAriaSnapshot` for standalone trees.
- For container traversal, an ordered sequence of focused controls' trees can detect skipped controls or changed order. Assert that focus can leave the container without prescribing an unrelated next destination.
- Scan closed triggers and open UI as applicable. Assert returned axe `violations`; for known issues, match their precise violation/check shapes with an issue link so additional violations fail. Do not mark a whole axe journey `it.fails`.
- ARIA trees, axe, keyboard checks, and visual checks complement each other; none proves actual reader speech.

## Native screen readers

Use colocated `*.screen-reader.test.ts` for real speech/navigation that browser assertions cannot establish. The native runner additionally provides `setupScreenReader`: `const { getTranscript, pressKey } = await setupScreenReader(locator)` starts a session with automatic cleanup, including on failure. The locator is optional when focus is already established. Use the session's `pressKey` to capture speech, not the ordinary keyboard fixture.

This operates the real desktop using VoiceOver/NVDA and GuidePup permissions. Run only as intentional native verification, outside browser CI:

```bash
vp run test:screen-reader FormattingToolbar.screen-reader.test.ts
```

Configuration: `tests/src/screen-reader/vite.config.screen-reader.ts`.

## Mobile and visual checks

- Mobile-emulated tests cover mobile-specific behavior, not duplicate desktop contracts. Do not use `screenshotFull` in Android-instance tests: its iframe resize drops touch emulation for subsequent tests.
- State the limit when emulation cannot reproduce the OS behavior. Real-device suite is parked on `mobile/emulator-layer` (PR #3034).
- For tall screenshots, inject `screenshotFull` from the browser fixtures (`tests/src/commands/browser/screenshotFull.ts`): ordinary iframe screenshots can silently clip below the fold; viewport resizing alone can scale the capture.
- Screenshot baselines are browser/Linux-specific. Update in Docker with `--update=true`. Changes within pixel tolerance may leave a stale baseline; remove the specific baseline first when a fresh capture is required.
