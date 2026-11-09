import { type PartialBlock } from "@blocknote/core";
import {
  openEditor,
  checkAriaSnapshot,
  pressKey,
  readOutline,
  checkFocusOutline,
} from "@root/tests/a11y/helpers.js";
import { expect, test, vi, beforeEach, afterEach } from "vite-plus/test";
import { page } from "vite-plus/test/browser";

// Start from "Before editor" after openEditor(). Keep these navigation steps
// identical to focusToggleHeadingWithAssertions in the keyboard suite.
async function focusToggleHeading() {
  const toggleButton = page.getByRole("button", {
    name: "Expand or collapse",
    exact: true,
  });
  while (document.activeElement !== toggleButton.element()) {
    await pressKey("Tab");
  }

  return toggleButton;
}

const toggleHeadingDocument: PartialBlock[] = [
  {
    id: "read-only-toggle-heading",
    type: "heading",
    props: { level: 2, isToggleable: true },
    content: "Details",
    children: [{ type: "paragraph", content: "Nested read-only content" }],
  },
];

beforeEach(() => {
  localStorage.removeItem("toggle-read-only-toggle-heading");
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.removeItem("toggle-read-only-toggle-heading");
});

test.describe("behavior", () => {
  test("read-only toggle heading: Tab reaches the toggle and Enter expands/collapses it", async () => {
    await openEditor(toggleHeadingDocument, { editable: false });
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    await focusToggleHeading();
    await pressKey("Enter");
    expect(setItem).toHaveBeenCalledExactlyOnceWith(
      "toggle-read-only-toggle-heading",
      "true",
    );
    setItem.mockClear();
    await pressKey("Enter");
    expect(setItem).toHaveBeenCalledExactlyOnceWith(
      "toggle-read-only-toggle-heading",
      "false",
    );
  });
});

test.describe("keyboard", () => {
  // Same navigation as focusToggleHeading, with focus and visibility assertions.
  async function focusToggleHeadingWithAssertions() {
    const toggleButton = page.getByRole("button", {
      name: "Expand or collapse",
      exact: true,
    });
    await expect.element(toggleButton).toBeVisible();
    const unfocusedOutline = readOutline(toggleButton.element());

    while (document.activeElement !== toggleButton.element()) {
      await pressKey("Tab");
    }
    await expect.element(toggleButton).toHaveFocus();
    await checkFocusOutline(toggleButton, unfocusedOutline);

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

  // The toggle heading focus indicator is not visually correct yet.
  // TODO: Fix the focus appearance before enabling.
  test.skip("read-only toggle heading: Tab reaches the toggle and Enter expands/collapses it", async () => {
    await openEditor(toggleHeadingDocument, { editable: false });
    const toggleButton = await focusToggleHeadingWithAssertions();
    await pressKey("Enter");
    await expect.element(toggleButton).toHaveFocus();
    await pressKey("Enter");
    await expect.element(toggleButton).toHaveFocus();
  });
});

test.describe("ARIA", () => {
  test("read-only toggle heading: Tab reaches the toggle and Enter expands/collapses it", async () => {
    await openEditor(toggleHeadingDocument, { editable: false });
    await focusToggleHeading();
    const editor = page.getByRole("textbox");
    await checkAriaSnapshot(editor, "collapsed");
    await pressKey("Enter");
    await checkAriaSnapshot(editor, "expanded");
    await pressKey("Enter");
    await checkAriaSnapshot(editor, "collapsed again");
  });
});
