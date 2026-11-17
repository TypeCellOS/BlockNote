import { type PartialBlock } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import type { ReactNode } from "react";
import { expect, describe, vi, beforeEach, afterEach } from "vite-plus/test";

const toggleHeadingDocument: PartialBlock[] = [
  {
    id: "read-only-toggle-heading",
    type: "heading",
    props: { level: 2, isToggleable: true },
    content: "Details",
    children: [{ type: "paragraph", content: "Nested read-only content" }],
  },
];

function outside({ children }: { children: ReactNode }) {
  return (
    <>
      <button type="button">Before editor</button>
      {children}
      <button type="button">After editor</button>
    </>
  );
}

beforeEach(() => {
  localStorage.removeItem("toggle-read-only-toggle-heading");
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.removeItem("toggle-read-only-toggle-heading");
});

describe("behavior", () => {
  it("read-only toggle heading: Tab reaches the toggle and Enter expands/collapses it", async ({
    setupEditor,
    page,
    focusUntil,
    pressKey,
  }) => {
    await setupEditor({
      initialContent: toggleHeadingDocument,
      props: { editable: false, theme: "light" },
      outside,
    });
    page
      .getByRole("button", { name: "Before editor", exact: true })
      .element()
      .focus();
    const toggleButton = page.getByRole("button", {
      name: "Expand or collapse",
      exact: true,
    });
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    await focusUntil(toggleButton);
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

describe("keyboard", () => {
  // Toggle headings represent interactive blocks in this accessibility vertical slice.
  // Keyboard access to toggle controls from within an editable block is not implemented.
  it.skip("editable toggle heading: toggle is keyboard accessible while the editor has focus", async () => {
    // TODO: The keyboard interaction for controls within an editable editor is TBD.
    // Reach the toggle while the editor has focus, expand/collapse its children,
    // and return to editing without changing the document content.
    // In editable mode, skip the toggle in page tab navigation outside the editor;
    // in read-only mode it must remain a regular tab stop (tested below).
    // Capture its focus indicator and announcements of its name, role and expanded state.
    // A direct toggle shortcut alone would not require a full browser test;
    // this placeholder covers the eventual keyboard focus/navigation behavior.
  });

  it("read-only toggle heading: Tab navigation and visible focus after Enter", async ({
    setupEditor,
    page,
    focusUntil,
    pressKey,
    captureFocusOutline,
  }) => {
    await setupEditor({
      initialContent: toggleHeadingDocument,
      props: { editable: false, theme: "light" },
      outside,
    });
    page
      .getByRole("button", { name: "Before editor", exact: true })
      .element()
      .focus();
    const toggleButton = page.getByRole("button", {
      name: "Expand or collapse",
      exact: true,
    });
    await expect.element(toggleButton).toBeVisible();
    const compareFocusOutline = captureFocusOutline(toggleButton);
    await focusUntil(toggleButton);
    await expect.element(toggleButton).toHaveFocus();
    await compareFocusOutline(toggleButton);

    await pressKey("Enter");
    await expect.element(toggleButton).toHaveFocus();
    await compareFocusOutline(toggleButton);
    await pressKey("Enter");
    await expect.element(toggleButton).toHaveFocus();
    await compareFocusOutline(toggleButton);

    await pressKey("Tab");
    await expect
      .element(page.getByRole("button", { name: "After editor", exact: true }))
      .toHaveFocus();
    await pressKey("Shift+Tab");
    await expect.element(toggleButton).toHaveFocus();
    await compareFocusOutline(toggleButton);
  });
});

describe("a11y", () => {
  it("read-only toggle heading: Tab reaches the toggle and Enter expands/collapses it", async ({
    setupEditor,
    page,
    focusUntil,
    pressKey,
  }) => {
    await setupEditor({
      initialContent: toggleHeadingDocument,
      props: { editable: false, theme: "light" },
      outside,
    });
    page
      .getByRole("button", { name: "Before editor", exact: true })
      .element()
      .focus();
    await focusUntil(
      page.getByRole("button", {
        name: "Expand or collapse",
        exact: true,
      }),
    );
    const editor = page.getByRole("textbox");
    await expect.element(editor).toMatchAriaInlineSnapshot(`
      - textbox:
        - button "Expand or collapse"
        - heading "Details" [level=2]
    `);
    await pressKey("Enter");
    await expect.element(editor).toMatchAriaInlineSnapshot(`
      - textbox:
        - button "Expand or collapse" [expanded]
        - heading "Details" [level=2]
        - paragraph: Nested read-only content
    `);
    await pressKey("Enter");
    await expect.element(editor).toMatchAriaInlineSnapshot(`
      - textbox:
        - button "Expand or collapse"
        - heading "Details" [level=2]
    `);
  });
});
