import { expect, test } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import {
  checkAriaSnapshot,
  openEditor,
  pressKey,
} from "@root/tests/a11y/helpers.js";

// Toggle headings represent interactive blocks in this accessibility vertical slice.
// Keyboard access to toggle controls from within an editable block is not implemented.
test.skip("editable toggle heading: toggle is keyboard accessible while the editor has focus", async () => {
  // TODO: The keyboard interaction for controls within an editable editor is TBD.
  // Reach the toggle while the editor has focus, expand/collapse its children,
  // and return to editing without changing the document content.
  // In editable mode, skip the toggle in page tab navigation outside the editor;
  // in read-only mode it must remain a regular tab stop (tested below).
  // Capture its focus indicator and announcements of its name, role and expanded state.
  // A direct toggle shortcut alone would not require a full browser test;
  // this placeholder covers the eventual keyboard focus/navigation behavior.
});

test("read-only toggle heading: Tab reaches the toggle and Enter expands/collapses it", async () => {
  const id = "read-only-toggle-heading";
  // Reset only this fixture's persisted expansion state before each run.
  localStorage.removeItem(`toggle-${id}`);
  await openEditor(
    [
      {
        id,
        type: "heading",
        props: { level: 2, isToggleable: true },
        content: "Details",
        children: [{ type: "paragraph", content: "Nested read-only content" }],
      },
    ],
    { editable: false },
  );
  const toggle = page.getByRole("button", {
    name: "Expand or collapse",
    exact: true,
  });
  const content = page.getByText("Nested read-only content", { exact: true });
  await expect.element(content).not.toBeVisible();
  await expect.element(toggle).toHaveAttribute("aria-expanded", "false");
  await checkAriaSnapshot(
    page.getByRole("main").getByRole("document"),
    "collapsed",
  );

  // Start at Before editor and reach the toggle through the page's tab order.
  // Do not focus the button directly: that would hide a keyboard trap.
  for (
    let step = 0;
    step < 3 && document.activeElement !== toggle.element();
    step++
  ) {
    await pressKey("Tab");
  }
  await expect.element(toggle).toHaveFocus();
  await pressKey("Enter");
  await expect.element(content).toBeVisible();
  await expect.element(toggle).toHaveAttribute("aria-expanded", "true");
  await checkAriaSnapshot(
    page.getByRole("main").getByRole("document"),
    "expanded",
  );
  await expect.element(toggle).toHaveFocus();
  await pressKey("Enter");
  await expect.element(content).not.toBeVisible();
  await expect.element(toggle).toHaveAttribute("aria-expanded", "false");
  await checkAriaSnapshot(
    page.getByRole("main").getByRole("document"),
    "collapsed again",
  );
  await expect.element(toggle).toHaveFocus();
  await pressKey("Tab");
  await expect
    .element(page.getByRole("button", { name: "After editor", exact: true }))
    .toHaveFocus();
  // TODO: Capture its focus indicator and screen-reader name/expanded state.
});
