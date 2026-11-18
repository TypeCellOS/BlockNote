import { describe, expect } from "vite-plus/test";
import { TextAlignButton } from "./TextAlignButton.js";
import { FormattingToolbar } from "../FormattingToolbar.js";
import { CellSelection } from "@tiptap/pm/tables";

describe("TextAlignButton", () => {
  describe("unit", () => {
    it("hides for read-only content and blocks without alignment, and reappears for text", async ({
      setupEditor,
      page,
    }) => {
      const { editor, rerender } = await setupEditor({
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
      async (
        alignment,
        { setupEditor, selectText, compareDocuments, page },
      ) => {
        const { editor } = await setupEditor({
          initialContent: [
            { id: "before", type: "paragraph", content: "Before" },
            {
              id: "selected",
              type: "paragraph",
              props: {
                textAlignment: alignment === "left" ? "center" : "left",
              },
              content: "Selected text",
            },
            { id: "after", type: "paragraph", content: "After" },
          ],
          props: { formattingToolbar: false },
          children: <TextAlignButton textAlignment={alignment} />,
        });
        selectText(editor, "Selected text");
        const documentBefore = editor.document;
        const button = page.getByRole("button", {
          name: editor.dictionary.formatting_toolbar[`align_${alignment}`]
            .tooltip,
          exact: true,
        });
        await expect.element(button).toHaveAttribute("aria-pressed", "false");

        await button.click();

        expect(compareDocuments(documentBefore, editor.document)).toEqual([
          {
            type: "update",
            id: "selected",
            changes: [
              { op: "replace", path: "/props/textAlignment", value: alignment },
            ],
          },
        ]);
        await expect.element(button).toHaveAttribute("aria-pressed", "true");
      },
    );

    it("aligns every selected block without changing an unselected neighbor", async ({
      setupEditor,
      compareDocuments,
      page,
    }) => {
      const { editor } = await setupEditor({
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

      expect(compareDocuments(before, editor.document)).toMatchInlineSnapshot(`
        [
          {
            "changes": [
              {
                "op": "replace",
                "path": "/props/textAlignment",
                "value": "center",
              },
            ],
            "id": "first",
            "type": "update",
          },
          {
            "changes": [
              {
                "op": "replace",
                "path": "/props/textAlignment",
                "value": "center",
              },
            ],
            "id": "second",
            "type": "update",
          },
        ]
      `);
    });

    it("aligns only the selected table cells", async ({
      setupEditor,
      compareDocuments,
      page,
    }) => {
      const { editor } = await setupEditor({
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
      // The alignment action shares and mutates table-cell props; detach the baseline.
      const before = structuredClone(editor.document);

      await page
        .getByRole("button", {
          name: editor.dictionary.formatting_toolbar.align_center.tooltip,
          exact: true,
        })
        .click();

      expect(compareDocuments(before, editor.document)).toMatchInlineSnapshot(`
        [
          {
            "changes": [
              {
                "op": "replace",
                "path": "/content/rows/0/cells/0/props/textAlignment",
                "value": "center",
              },
              {
                "op": "replace",
                "path": "/content/rows/0/cells/1/props/textAlignment",
                "value": "center",
              },
            ],
            "id": "table",
            "type": "update",
          },
        ]
      `);
    });
  });

  describe("aria", () => {
    it("updates its pressed state when selection moves between differently aligned blocks", async ({
      setupEditor,
      selectText,
      page,
    }) => {
      const { editor } = await setupEditor({
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
      setupEditor,
      runAxe,
      page,
    }) => {
      await setupEditor({
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

      const { violations } = await runAxe(page.getByRole("toolbar"));
      expect(violations).toEqual([]);
    });
  });

  describe("keyboard", () => {
    it.for(["left", "center", "right", "justify"] as const)(
      "shows a keyboard focus ring for %s alignment",
      async (
        alignment,
        { setupEditor, selectText, captureFocusOutline, pressKey, page },
      ) => {
        const { editor } = await setupEditor({
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
        const compareFocusOutline = captureFocusOutline(button);

        await pressKey("Tab");

        await expect.element(button).toHaveFocus();
        await compareFocusOutline(button);
      },
    );

    it.for(["Enter", "Space"])(
      "aligns with %s and restores editor focus",
      async (key, { setupEditor, selectText, pressKey, page }) => {
        const { editor } = await setupEditor({
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

        await pressKey("Tab");

        await expect.element(button).toHaveFocus();

        await pressKey(key);

        await expect.element(button).toHaveAttribute("aria-pressed", "true");
        await expect.element(page.getByRole("textbox")).toHaveFocus();
      },
    );
  });
});
