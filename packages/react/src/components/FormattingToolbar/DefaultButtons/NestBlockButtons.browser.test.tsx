import { describe, expect } from "vite-plus/test";
import { NestBlockButton, UnnestBlockButton } from "./NestBlockButtons.js";

describe("NestBlockButtons", () => {
  describe("unit", () => {
    it.for([
      { name: "nest", Button: NestBlockButton },
      { name: "unnest", Button: UnnestBlockButton },
    ])(
      "hides $name in read-only mode and on blocks without inline content",
      async ({ Button }, { setupEditor, page }) => {
        const { editor, rerender } = await setupEditor({
          initialContent: [
            { id: "text", type: "paragraph", content: "Text" },
            { id: "divider", type: "divider" },
          ],
          props: { editable: false, formattingToolbar: false },
          children: <Button />,
        });
        const button = page.getByRole("button");
        await expect.element(button).not.toBeInTheDocument();

        rerender({ editable: true });
        await expect.element(button).toBeVisible();

        editor.setTextCursorPosition("divider");
        await expect.element(button).not.toBeInTheDocument();

        editor.setTextCursorPosition("text");
        await expect.element(button).toBeVisible();
      },
    );
  });

  describe("integration", () => {
    it("moves the selected block under its previous sibling without changing their contents", async ({
      setupEditor,
      selectText,
      compareDocuments,
      page,
    }) => {
      const { editor } = await setupEditor({
        initialContent: [
          { id: "parent", type: "paragraph", content: "Parent" },
          { id: "selected", type: "paragraph", content: "Selected text" },
          { id: "after", type: "paragraph", content: "After" },
        ],
        props: { formattingToolbar: false },
        children: <NestBlockButton />,
      });
      selectText(editor, "Selected text");
      const before = editor.document;

      await page
        .getByRole("button", {
          name: editor.dictionary.formatting_toolbar.nest.tooltip,
          exact: true,
        })
        .click();

      expect(compareDocuments(before, editor.document)).toMatchInlineSnapshot(`
        "BEFORE:
        <block-selected path="1" type="paragraph">Selected text</block-selected>

        AFTER:
        <block-parent path="0" type="paragraph">Parent
          <block-selected path="0.0" type="paragraph">Selected text</block-selected>
        </block-parent>"
      `);
    });

    it("moves the selected block out of its parent without changing their contents", async ({
      setupEditor,
      selectText,
      compareDocuments,
      page,
    }) => {
      const { editor } = await setupEditor({
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
      const before = editor.document;

      await page
        .getByRole("button", {
          name: editor.dictionary.formatting_toolbar.unnest.tooltip,
          exact: true,
        })
        .click();

      expect(compareDocuments(before, editor.document)).toMatchInlineSnapshot(`
        "BEFORE:
        <block-parent path="0" type="paragraph">Parent
          <block-selected path="0.0" type="paragraph">Selected text</block-selected>
        </block-parent>

        AFTER:
        <block-selected path="1" type="paragraph">Selected text</block-selected>"
      `);
    });
  });

  describe("aria", () => {
    it("only enables nesting when a previous sibling is available", async ({
      setupEditor,
      selectText,
      page,
    }) => {
      const { editor } = await setupEditor({
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

    it("only enables unnesting for a nested block", async ({
      setupEditor,
      selectText,
      page,
    }) => {
      const { editor } = await setupEditor({
        initialContent: [
          {
            type: "paragraph",
            content: "Parent",
            children: [{ type: "paragraph", content: "Child" }],
          },
        ],
        props: { formattingToolbar: false },
        children: <UnnestBlockButton />,
      });
      const button = page.getByRole("button", {
        name: editor.dictionary.formatting_toolbar.unnest.tooltip,
        exact: true,
      });
      selectText(editor, "Parent");
      await expect.element(button).toBeDisabled();

      selectText(editor, "Child");

      await expect.element(button).toBeEnabled();
    });
  });

  describe("axe", () => {
    it.for([
      { direction: "nest", Button: NestBlockButton },
      { direction: "unnest", Button: UnnestBlockButton },
    ] as const)(
      "checks the $direction control",
      async (
        { direction, Button },
        { setupEditor, selectText, runAxe, page },
      ) => {
        const { editor } = await setupEditor({
          initialContent: [
            {
              type: "paragraph",
              content: "Parent",
              children: [{ type: "paragraph", content: "Child" }],
            },
          ],
          props: { formattingToolbar: false },
          children: <Button />,
        });
        selectText(editor, "Child");

        const button = page.getByRole("button", {
          name: editor.dictionary.formatting_toolbar[direction].tooltip,
          exact: true,
        });
        await expect.element(button).toBeVisible();
        const { violations } = await runAxe(button);
        expect(violations).toEqual([]);
      },
    );
  });

  describe("keyboard", () => {
    it.for([
      { direction: "nest", Button: NestBlockButton },
      { direction: "unnest", Button: UnnestBlockButton },
    ] as const)(
      "activates $direction and returns focus to the editor",
      async (
        { direction, Button },
        { setupEditor, selectText, captureFocusOutline, pressKey, page },
      ) => {
        const { editor } = await setupEditor({
          initialContent:
            direction === "nest"
              ? [
                  { id: "parent", type: "paragraph", content: "Parent" },
                  {
                    id: "selected",
                    type: "paragraph",
                    content: "Selected text",
                  },
                ]
              : [
                  {
                    id: "parent",
                    type: "paragraph",
                    content: "Parent",
                    children: [
                      {
                        id: "selected",
                        type: "paragraph",
                        content: "Selected text",
                      },
                    ],
                  },
                ],
          props: { formattingToolbar: false },
          children: <Button />,
        });
        await page.getByRole("textbox").click();
        selectText(editor, "Selected text");
        const button = page.getByRole("button", {
          name: editor.dictionary.formatting_toolbar[direction].tooltip,
          exact: true,
        });
        const compareFocusOutline = captureFocusOutline(button);

        await pressKey("Tab");

        await expect.element(button).toHaveFocus();
        await compareFocusOutline(button);

        await pressKey("Enter");

        await expect.element(page.getByRole("textbox")).toHaveFocus();
        expect(
          editor.getBlock("parent")?.children.map((block) => block.id),
        ).toEqual(direction === "nest" ? ["selected"] : []);
        expect(editor.getSelectedText()).toBe("Selected text");
      },
    );

    it.for([
      { direction: "nest", Button: NestBlockButton },
      { direction: "unnest", Button: UnnestBlockButton },
    ])(
      "skips the disabled $direction action when tabbing",
      async ({ Button }, { setupEditor, pressKey, page }) => {
        await setupEditor({
          props: { formattingToolbar: false },
          children: (
            <>
              <Button />
              <button>Next action</button>
            </>
          ),
        });
        await page.getByRole("textbox").click();

        await pressKey("Tab");

        await expect
          .element(
            page.getByRole("button", { name: "Next action", exact: true }),
          )
          .toHaveFocus();
      },
    );
  });
});
