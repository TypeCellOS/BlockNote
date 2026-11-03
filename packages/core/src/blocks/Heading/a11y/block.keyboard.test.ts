import { toggleHeadingDocument } from "./fixtures.js";
import { openEditor } from "@root/tests/a11y/helpers.js";
import { expect, test } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import {
  resetToggleHeading,
  focusNextItem,
  activateToggleHeading,
} from "./helpers.js";

// Same navigation as focusToggleHeading, with focus and visibility assertions.
async function focusToggleHeadingWithAssertions() {
  const toggleButton = page.getByRole("button", {
    name: "Expand or collapse",
    exact: true,
  });
  await expect.element(toggleButton).toBeVisible();

  while (document.activeElement !== toggleButton.element()) {
    await focusNextItem();
  }
  await expect.element(toggleButton).toHaveFocus();

  return toggleButton;
}
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
  resetToggleHeading();
  await openEditor(toggleHeadingDocument, { editable: false });
  const toggleButton = await focusToggleHeadingWithAssertions();
  await expect
    .element(page.getByRole("main").getByRole("document"))
    .toMatchScreenshot("toggle-heading-focused.png", {});
  await activateToggleHeading();
  await expect.element(toggleButton).toHaveFocus();
  await activateToggleHeading();
  await expect.element(toggleButton).toHaveFocus();
});
