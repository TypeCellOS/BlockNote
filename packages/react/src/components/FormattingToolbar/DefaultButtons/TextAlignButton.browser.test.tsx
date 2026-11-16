import { describe, expect } from "vite-plus/test";
import { TextAlignButton } from "./TextAlignButton.js";
import { FormattingToolbar } from "../FormattingToolbar.js";
import { CellSelection } from "@tiptap/pm/tables";

describe("TextAlignButton", () => {
  describe("unit", () => {
    it("hides for read-only content and blocks without alignment, and reappears for text", async ({
      renderEditor,
      page,
    }) => {
      const { editor, rerender } = await renderEditor({
        initialContent: [
          { id: "text", type: "paragraph", content: "Text" },
          { id: "divider", type: "divider" },
        ],
        props: { editable: false, formattingToolbar: false },
        children: <TextAlignButton textAlignment="center" />,
      });
      const button = page.getByRole("button", {
        name: editor.dictionary.formatting_toolbar.align_center.tooltip,
        exact: true,
      });
      await expect.element(button).not.toBeInTheDocument();

      rerender({ editable: true });
      await expect.element(button).toBeVisible();

      editor.setTextCursorPosition("divider");
      await expect.element(button).not.toBeInTheDocument();

      editor.setTextCursorPosition("text");
      await expect.element(button).toBeVisible();
    });
  });

  describe("integration", () => {
    it.for(["left", "center", "right", "justify"] as const)(
      "aligns the selected block %s without changing its text or neighboring blocks",
      async (textAlignment, { renderEditor, selectText, page }) => {
        const { editor } = await renderEditor({
          initialContent: [
            { id: "before", type: "paragraph", content: "Before" },
            {
              id: "selected",
              type: "paragraph",
              props: {
                textAlignment: textAlignment === "left" ? "center" : "left",
              },
              content: "Selected text",
            },
            { id: "after", type: "paragraph", content: "After" },
          ],
          props: { formattingToolbar: false },
          children: <TextAlignButton textAlignment={textAlignment} />,
        });
        selectText(editor, "Selected text");
        const documentBefore = editor.document;
        const button = page.getByRole("button", {
          name: editor.dictionary.formatting_toolbar[`align_${textAlignment}`]
            .tooltip,
          exact: true,
        });
        await expect.element(button).toHaveAttribute("aria-pressed", "false");

        await button.click();

        expect(editor.document).toEqual([
          documentBefore[0],
          {
            ...documentBefore[1],
            props: { ...documentBefore[1].props, textAlignment },
          },
          documentBefore[2],
        ]);
        await expect.element(button).toHaveAttribute("aria-pressed", "true");
      },
    );

    it("aligns every selected block without changing an unselected neighbor", async ({
      renderEditor,
      page,
    }) => {
      const { editor } = await renderEditor({
        initialContent: [
          { id: "first", type: "paragraph", content: "First" },
          { id: "second", type: "paragraph", content: "Second" },
          { id: "after", type: "paragraph", content: "After" },
        ],
        props: { formattingToolbar: false },
        children: <TextAlignButton textAlignment="center" />,
      });
      editor.setSelection("first", "second");
      const before = editor.document;

      await page
        .getByRole("button", {
          name: editor.dictionary.formatting_toolbar.align_center.tooltip,
          exact: true,
        })
        .click();

      expect(editor.document).toEqual([
        {
          ...before[0],
          props: { ...before[0].props, textAlignment: "center" },
        },
        {
          ...before[1],
          props: { ...before[1].props, textAlignment: "center" },
        },
        before[2],
      ]);
    });

    it("aligns only the selected table cells", async ({
      renderEditor,
      page,
    }) => {
      const { editor } = await renderEditor({
        initialContent: [
          {
            id: "table",
            type: "table",
            content: {
              type: "tableContent",
              rows: [
                { cells: ["First", "Second"] },
                { cells: ["Third", "Fourth"] },
              ],
            },
          },
        ],
        props: { formattingToolbar: false },
        children: <TextAlignButton textAlignment="center" />,
      });
      editor.transact((tr) => {
        const cells: number[] = [];
        tr.doc.descendants((node, pos) => {
          if (node.type.name === "tableCell") {
            cells.push(pos);
          }
        });
        tr.setSelection(CellSelection.create(tr.doc, cells[0], cells[1]));
      });
      const tableBefore = editor.getBlock("table");
      if (tableBefore?.type !== "table") {
        throw new Error("Expected table fixture");
      }

      await page
        .getByRole("button", {
          name: editor.dictionary.formatting_toolbar.align_center.tooltip,
          exact: true,
        })
        .click();

      expect(editor.getBlock("table")).toEqual({
        ...tableBefore,
        content: {
          ...tableBefore.content,
          rows: tableBefore.content.rows.map((row, index) =>
            index === 0
              ? {
                  ...row,
                  cells: row.cells.map((cell) => {
                    if (Array.isArray(cell)) {
                      throw new Error("Expected normalized table cells");
                    }
                    return {
                      ...cell,
                      props: { ...cell.props, textAlignment: "center" },
                    };
                  }),
                }
              : row,
          ),
        },
      });
    });
  });

  describe("keyboard", () => {
    it.for(["left", "center", "right", "justify"] as const)(
      "shows a keyboard focus ring for %s alignment",
      async (alignment, { renderEditor, selectText, commands, page }) => {
        const { editor } = await renderEditor({
          initialContent: [{ type: "paragraph", content: "Selected text" }],
          props: { formattingToolbar: false },
          children: <TextAlignButton textAlignment={alignment} />,
        });
        await page.getByRole("textbox").click();
        selectText(editor, "Selected text");
        const button = page.getByRole("button", {
          name: editor.dictionary.formatting_toolbar[`align_${alignment}`]
            .tooltip,
          exact: true,
        });
        const outline = await commands.readOutline(button.selector);

        await commands.pressKey("Tab");

        await expect.element(button).toHaveFocus();
        await commands.checkFocusOutline(button.selector, outline);
      },
    );

    it.for(["Enter", "Space"])(
      "aligns with %s and restores editor focus",
      async (key, { renderEditor, selectText, commands, page }) => {
        const { editor } = await renderEditor({
          initialContent: [
            { id: "text", type: "paragraph", content: "Selected text" },
          ],
          props: { formattingToolbar: false },
          children: <TextAlignButton textAlignment="center" />,
        });
        await page.getByRole("textbox").click();
        selectText(editor, "Selected text");
        const button = page.getByRole("button", {
          name: editor.dictionary.formatting_toolbar.align_center.tooltip,
          exact: true,
        });

        await commands.pressKey("Tab");

        await expect.element(button).toHaveFocus();

        await commands.pressKey(key);

        await expect.element(button).toHaveAttribute("aria-pressed", "true");
        await expect.element(page.getByRole("textbox")).toHaveFocus();
      },
    );
  });

  describe("ARIA", () => {
    it("updates its pressed state when selection moves between differently aligned blocks", async ({
      renderEditor,
      selectText,
      page,
    }) => {
      const { editor } = await renderEditor({
        initialContent: [
          { type: "paragraph", content: "Left" },
          {
            type: "paragraph",
            content: "Center",
            props: { textAlignment: "center" },
          },
        ],
        props: { formattingToolbar: false },
        children: <TextAlignButton textAlignment="center" />,
      });
      const button = page.getByRole("button", {
        name: editor.dictionary.formatting_toolbar.align_center.tooltip,
        exact: true,
      });
      selectText(editor, "Center");
      await expect.element(button).toHaveAttribute("aria-pressed", "true");

      selectText(editor, "Left");

      await expect.element(button).toHaveAttribute("aria-pressed", "false");
    });
  });

  describe("axe", () => {
    it("checks all alignment controls, including the selected one", async ({
      renderEditor,
      commands,
      annotate,
    }) => {
      await renderEditor({
        props: { formattingToolbar: false },
        children: (
          <FormattingToolbar>
            {(["left", "center", "right", "justify"] as const).map(
              (alignment) => (
                <TextAlignButton key={alignment} textAlignment={alignment} />
              ),
            )}
          </FormattingToolbar>
        ),
      });

      for (const warning of await commands.checkAxe('[role="toolbar"]')) {
        await annotate(warning, "warning");
      }
    });
  });
});
