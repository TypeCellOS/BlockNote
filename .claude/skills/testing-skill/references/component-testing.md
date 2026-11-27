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

Treat a popover as one UI unit: its trigger plus dropdown/dialog content, including nested menu actions. Keep availability, trigger state/relationships, menu actions, keyboard navigation/dismissal, focus, and both axe scans in the owning trigger's colocated suite, even when the implementation spans several files. Do not create separate UI suites for its menu items or form/picker contents solely to mirror source-file boundaries. Cover distinct integrations of shared content through their real owning controls when relevant to the task; sharing an implementation does not require expanding the task to every consumer. Pure reusable logic can still have independent unit tests.

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

Render the component directly with unrelated default UI disabled. Toolbar and side-menu item tests should render the item without the toolbar or side menu. Use the same minimal setup across behavior, ARIA, axe, and keyboard tests. Do not add ancestors merely to supply styling: if an independently rendered control needs ancestor selectors to look correct, fix its own styling classes and prove the standalone behavior.

Preserve required behavioral context. Menu items still need their menu root/providers; exercise them through the real owning popover, supplying custom children when useful to isolate an item. Do not introduce dummy menus, synthetic triggers, or wrapper-only fixtures. An early `return null` can conceal missing context in a hidden-state test; also verify the transition to visible where relevant. Keep container composition and traversal in the container's suite. Use the actual control for the action under test; editor APIs may establish the initial state.

Follow the [public-editor-API rules](../SKILL.md#rules) when establishing state.

Shared rendering handles StrictMode, initial commit, fonts, and cleanup. Wait for later selection-driven UI explicitly. Skin selection defaults to Mantine and loads lazily; loaded CSS remains, so prefer one skin per file.

Prefer accessible locators using dictionary labels. Direct focus is valid setup; use real Tab input when traversal is the contract. Wait for observable readiness: a menu can be visible before it receives focus.

Stop navigation as soon as its target is reached and bound repeated keypresses explicitly; fail with the target and limit rather than waiting for a test timeout. `focusUntil` also detects cycles, stalled focus, and document boundaries.

## Accessibility assertions

- Assert focus with `toHaveFocus()`. Check each owned control's indicator independently: capture its unfocused appearance with `const compareFocusOutline = captureFocusOutline(control)`, move focus through keyboard input, then `await compareFocusOutline()`.
- Scope accessible-state assertions to the control/popup. Use built-in `toMatchAriaInlineSnapshot` / `toMatchAriaSnapshot` for standalone trees.
- For container traversal, an ordered sequence of focused controls' trees can detect skipped controls or changed order. Assert that focus can leave the container without prescribing an unrelated next destination.
- For every button that opens a popover, menu, or dialog, axe coverage must include **both the button and the open popup**, including nested submenus where applicable. Scan the closed trigger, activate it, wait for the popup to be visible, and scan the popup itself. A scan scoped to the button or its container does not cover portaled content. Keep both scans in the owning control's suite; separate test cases are fine.
- Assert returned axe `violations`; for known issues, match their precise violation/check shapes with an issue link so additional violations fail. Do not mark a whole axe journey `it.fails`.
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

## Coverage review before finishing

Review both a leaf and a container from the golden examples, then map each relevant contract to its lowest owner. A file with every category heading is not evidence of complete coverage.

- **Editability and availability:** For mutating controls, check read-only setup and editable → read-only → editable transitions with an existing target/selection. Also cover relevant schema or block-type restrictions. Test the layer that enforces each restriction; controller hiding alone does not prove an independently rendered public control is safe. Do not manufacture extension state in a controller integration test to bypass the gate being tested.
- **Leaf accessibility:** Put names, roles, state/relationships, scoped axe scans, keyboard activation, and visible focus checks beside the individual control that owns them, treating the trigger and its popup content as one unit. Verify both trigger and open-popup axe coverage as described above. Containers test composition, traversal/order, and escape from the container; a parent scan does not replace leaf coverage. Render controls standalone, retaining required menu context as described above.
- **Primary interactions:** Exercise each component's defining interaction through the actual UI. A drag handle needs a real pointer drag from the handle to a drop destination, asserting document order/content and cleanup (including continued interaction afterward). A draggable attribute, a spy on a handler, or calling the editor's drag/move API does not prove the handle is wired correctly. Include a meaningful structural case such as moving a parent with children where relevant. Apply the same reasoning to resizing, uploading, selection, and other gestures.
- **Assertions and setup:** Use setup APIs only to establish preconditions. Prefer document diffs for mutations, accessible-tree snapshots for compact ARIA contracts, and observable readiness over delays. Explicitly wait for keyboard focus before continuing popup navigation. Preserve unrelated content and selection where that is part of the contract.

If these checks expose a defect, report it and prove the regression before fixing it. Do not omit the failing interaction, weaken the expectation to current broken behavior, or add an untracked expected failure to make the suite pass.
