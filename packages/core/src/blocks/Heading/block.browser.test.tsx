import { commands } from "@root/tests/src/utils/context.js";
import { type PartialBlock } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { render } from "vitest-browser-react";

import { expect, test, vi, beforeEach, afterEach } from "vite-plus/test";
import { page } from "vite-plus/test/browser";

// Start from "Before editor" after setup. Keep these navigation steps
// identical to focusToggleHeadingWithAssertions in the keyboard suite.
async function focusToggleHeading() {
  const toggleButton = page.getByRole("button", {
    name: "Expand or collapse",
    exact: true,
  });
  for (
    let presses = 0;
    document.activeElement !== toggleButton.element();
    presses++
  ) {
    if (presses >= 10) {
      throw new Error(
        "Could not focus the toggle heading button after 10 Tab presses",
      );
    }
    await commands.pressKey("Tab");
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

function TestEditor() {
  const editor = useCreateBlockNote({ initialContent: toggleHeadingDocument });
  return (
    <>
      <button type="button">Before editor</button>
      <BlockNoteView editor={editor} editable={false} theme="light" />
      <button type="button">After editor</button>
    </>
  );
}

beforeEach(async () => {
  localStorage.removeItem("toggle-read-only-toggle-heading");
  await render(<TestEditor />);
  await expect.element(page.getByRole("textbox")).toBeVisible();
  await document.fonts.ready;
  page
    .getByRole("button", { name: "Before editor", exact: true })
    .element()
    .focus();
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.removeItem("toggle-read-only-toggle-heading");
});

test.describe("behavior", () => {
  test("read-only toggle heading: Tab reaches the toggle and Enter expands/collapses it", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    await focusToggleHeading();
    await commands.pressKey("Enter");
    expect(setItem).toHaveBeenCalledExactlyOnceWith(
      "toggle-read-only-toggle-heading",
      "true",
    );
    setItem.mockClear();
    await commands.pressKey("Enter");
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
    const unfocusedOutline = await commands.readOutline(toggleButton.selector);

    for (
      let presses = 0;
      document.activeElement !== toggleButton.element();
      presses++
    ) {
      if (presses >= 10) {
        throw new Error(
          "Could not focus the toggle heading button after 10 Tab presses",
        );
      }
      await commands.pressKey("Tab");
    }
    await expect.element(toggleButton).toHaveFocus();
    await commands.checkFocusOutline(toggleButton.selector, unfocusedOutline);

    return { toggleButton, unfocusedOutline };
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

  test("read-only toggle heading: Tab navigation and visible focus after Enter", async () => {
    const { toggleButton, unfocusedOutline } =
      await focusToggleHeadingWithAssertions();
    await commands.pressKey("Enter");
    await expect.element(toggleButton).toHaveFocus();
    await commands.checkFocusOutline(toggleButton.selector, unfocusedOutline);
    await commands.pressKey("Enter");
    await expect.element(toggleButton).toHaveFocus();
    await commands.checkFocusOutline(toggleButton.selector, unfocusedOutline);

    await commands.pressKey("Tab");
    await expect
      .element(page.getByRole("button", { name: "After editor", exact: true }))
      .toHaveFocus();
    await commands.pressKey("Shift+Tab");
    await expect.element(toggleButton).toHaveFocus();
    await commands.checkFocusOutline(toggleButton.selector, unfocusedOutline);
  });
});

test.describe("ARIA", () => {
  test("read-only toggle heading: Tab reaches the toggle and Enter expands/collapses it", async () => {
    await focusToggleHeading();
    const editor = page.getByRole("textbox");
    expect(await commands.readAriaSnapshot(editor.selector)).toMatchSnapshot(
      "collapsed",
    );
    await commands.pressKey("Enter");
    expect(await commands.readAriaSnapshot(editor.selector)).toMatchSnapshot(
      "expanded",
    );
    await commands.pressKey("Enter");
    expect(await commands.readAriaSnapshot(editor.selector)).toMatchSnapshot(
      "collapsed again",
    );
  });
});
