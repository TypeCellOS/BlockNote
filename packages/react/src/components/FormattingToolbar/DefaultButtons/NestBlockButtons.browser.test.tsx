import { describe, expect } from "vite-plus/test";
import { NestBlockButton, UnnestBlockButton } from "./NestBlockButtons.js";

describe("NestBlockButton", () => {
  it("updates its disabled state when selection moves to a block that can be nested", async ({
    renderEditor,
    selectText,
    page,
  }) => {
    const { editor } = await renderEditor({
      initialContent: [
        { type: "paragraph", content: "First block" },
        { type: "paragraph", content: "Second block" },
      ],
      props: { formattingToolbar: false },
      children: <NestBlockButton />,
    });
    const button = page.getByRole("button", {
      name: editor.dictionary.formatting_toolbar.nest.tooltip,
      exact: true,
    });
    selectText(editor, "First block");

    await expect.element(button).toBeDisabled();

    selectText(editor, "Second block");

    await expect.element(button).toBeEnabled();
  });

  it("moves the selected block under its previous sibling without changing their contents", async ({
    renderEditor,
    selectText,
    page,
  }) => {
    const { editor } = await renderEditor({
      initialContent: [
        { id: "parent", type: "paragraph", content: "Parent" },
        { id: "selected", type: "paragraph", content: "Selected text" },
        { id: "after", type: "paragraph", content: "After" },
      ],
      props: { formattingToolbar: false },
      children: <NestBlockButton />,
    });
    selectText(editor, "Selected text");
    const [parent, selected, after] = editor.document;

    await page
      .getByRole("button", {
        name: editor.dictionary.formatting_toolbar.nest.tooltip,
        exact: true,
      })
      .click();

    expect(editor.document).toEqual([
      { ...parent, children: [selected] },
      after,
    ]);
  });
});

describe("UnnestBlockButton", () => {
  it("moves the selected block out of its parent without changing their contents", async ({
    renderEditor,
    selectText,
    page,
  }) => {
    const { editor } = await renderEditor({
      initialContent: [
        {
          id: "parent",
          type: "paragraph",
          content: "Parent",
          children: [
            { id: "selected", type: "paragraph", content: "Selected text" },
          ],
        },
        { id: "after", type: "paragraph", content: "After" },
      ],
      props: { formattingToolbar: false },
      children: <UnnestBlockButton />,
    });
    selectText(editor, "Selected text");
    const [parent, after] = editor.document;

    await page
      .getByRole("button", {
        name: editor.dictionary.formatting_toolbar.unnest.tooltip,
        exact: true,
      })
      .click();

    expect(editor.document).toEqual([
      { ...parent, children: [] },
      parent.children[0],
      after,
    ]);
  });
});
