import { describe, expect } from "vite-plus/test";
import { NestBlockButton, UnnestBlockButton } from "./NestBlockButtons.js";
import { FormattingToolbar } from "../FormattingToolbar.js";

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

    it("moves the selected block out of its parent without changing their contents", async ({
      setupEditor,
      selectText,
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

  describe("keyboard", () => {
    it.for([
      { direction: "nest", Button: NestBlockButton },
      { direction: "unnest", Button: UnnestBlockButton },
    ] as const)(
      "activates $direction and returns focus to the editor",
      async (
        { direction, Button },
        {
          setupEditor,
          selectText,
          readFocusOutline,
          pressKey,
          assertFocusOutline,
          page,
        },
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
        const outline = readFocusOutline(button);

        await pressKey("Tab");

        await expect.element(button).toHaveFocus();
        await assertFocusOutline(button, outline);

        await pressKey("Enter");

        await expect.element(page.getByRole("textbox")).toHaveFocus();
        expect(
          editor.getBlock("parent")?.children.map((block) => block.id),
        ).toEqual(direction === "nest" ? ["selected"] : []);
        expect(editor.getSelectedText()).toBe("Selected text");
      },
    );

    it("skips disabled actions when tabbing", async ({
      setupEditor,
      pressKey,
      page,
    }) => {
      await setupEditor({
        props: { formattingToolbar: false },
        children: (
          <FormattingToolbar>
            <NestBlockButton />
            <UnnestBlockButton />
            <button>Next action</button>
          </FormattingToolbar>
        ),
      });
      await page.getByRole("textbox").click();

      await pressKey("Tab");

      await expect
        .element(page.getByRole("button", { name: "Next action", exact: true }))
        .toHaveFocus();
    });
  });

  describe("a11y", () => {
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

    it("checks enabled and disabled nesting controls", async ({
      setupEditor,
      selectText,
      runAxe,
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
        children: (
          <FormattingToolbar>
            <NestBlockButton />
            <UnnestBlockButton />
          </FormattingToolbar>
        ),
      });
      selectText(editor, "Child");

      const { violations } = await runAxe(page.getByRole("toolbar"));
      expect(violations).toEqual([]);
    });
  });
});
