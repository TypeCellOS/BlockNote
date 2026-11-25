import { CellSelection } from "@tiptap/pm/tables";
import { describe, expect } from "vite-plus/test";
import { TextAlignButton } from "./TextAlignButton.js";
import { FormattingToolbar } from "../FormattingToolbar.js";
import { viewProps } from "./defaultButton.test.fixture.js";

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
        props: { ...viewProps, editable: false },
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
    it("aligns the selected block left without changing its text or neighboring blocks", async ({
      setupEditor,
      selectText,
      compareDocuments,
      page,
    }) => {
      const { editor } = await setupEditor({
        initialContent: [
          { id: "before", type: "paragraph", content: "Before" },
          {
            id: "selected",
            type: "paragraph",
            props: { textAlignment: "center" },
            content: "Selected text",
          },
          { id: "after", type: "paragraph", content: "After" },
        ],
        props: viewProps,
        children: <TextAlignButton textAlignment="left" />,
      });
      selectText(editor, "Selected text");
      const before = editor.document;
      const button = page.getByRole("button", {
        name: editor.dictionary.formatting_toolbar.align_left.tooltip,
        exact: true,
      });
      await expect.element(button).toHaveAttribute("aria-pressed", "false");

      await button.click();

      expect(compareDocuments(before, editor.document)).toMatchInlineSnapshot(`
        "BEFORE:
        <block-selected path="1" type="paragraph" props={"textAlignment":"center"}>Selected text</block-selected>

        AFTER:
        <block-selected path="1" type="paragraph" props={"textAlignment":"left"}>Selected text</block-selected>"
      `);
      await expect.element(button).toHaveAttribute("aria-pressed", "true");
    });

    it("aligns the selected block center without changing its text or neighboring blocks", async ({
      setupEditor,
      selectText,
      compareDocuments,
      page,
    }) => {
      const { editor } = await setupEditor({
        initialContent: [
          { id: "before", type: "paragraph", content: "Before" },
          {
            id: "selected",
            type: "paragraph",
            props: { textAlignment: "left" },
            content: "Selected text",
          },
          { id: "after", type: "paragraph", content: "After" },
        ],
        props: viewProps,
        children: <TextAlignButton textAlignment="center" />,
      });
      selectText(editor, "Selected text");
      const before = editor.document;
      const button = page.getByRole("button", {
        name: editor.dictionary.formatting_toolbar.align_center.tooltip,
        exact: true,
      });
      await expect.element(button).toHaveAttribute("aria-pressed", "false");

      await button.click();

      expect(compareDocuments(before, editor.document)).toMatchInlineSnapshot(`
        "BEFORE:
        <block-selected path="1" type="paragraph" props={"textAlignment":"left"}>Selected text</block-selected>

        AFTER:
        <block-selected path="1" type="paragraph" props={"textAlignment":"center"}>Selected text</block-selected>"
      `);
      await expect.element(button).toHaveAttribute("aria-pressed", "true");
    });

    it("aligns the selected block right without changing its text or neighboring blocks", async ({
      setupEditor,
      selectText,
      compareDocuments,
      page,
    }) => {
      const { editor } = await setupEditor({
        initialContent: [
          { id: "before", type: "paragraph", content: "Before" },
          {
            id: "selected",
            type: "paragraph",
            props: { textAlignment: "left" },
            content: "Selected text",
          },
          { id: "after", type: "paragraph", content: "After" },
        ],
        props: viewProps,
        children: <TextAlignButton textAlignment="right" />,
      });
      selectText(editor, "Selected text");
      const before = editor.document;
      const button = page.getByRole("button", {
        name: editor.dictionary.formatting_toolbar.align_right.tooltip,
        exact: true,
      });
      await expect.element(button).toHaveAttribute("aria-pressed", "false");

      await button.click();

      expect(compareDocuments(before, editor.document)).toMatchInlineSnapshot(`
        "BEFORE:
        <block-selected path="1" type="paragraph" props={"textAlignment":"left"}>Selected text</block-selected>

        AFTER:
        <block-selected path="1" type="paragraph" props={"textAlignment":"right"}>Selected text</block-selected>"
      `);
      await expect.element(button).toHaveAttribute("aria-pressed", "true");
    });

    it("aligns the selected block justify without changing its text or neighboring blocks", async ({
      setupEditor,
      selectText,
      compareDocuments,
      page,
    }) => {
      const { editor } = await setupEditor({
        initialContent: [
          { id: "before", type: "paragraph", content: "Before" },
          {
            id: "selected",
            type: "paragraph",
            props: { textAlignment: "left" },
            content: "Selected text",
          },
          { id: "after", type: "paragraph", content: "After" },
        ],
        props: viewProps,
        children: <TextAlignButton textAlignment="justify" />,
      });
      selectText(editor, "Selected text");
      const before = editor.document;
      const button = page.getByRole("button", {
        name: editor.dictionary.formatting_toolbar.align_justify.tooltip,
        exact: true,
      });
      await expect.element(button).toHaveAttribute("aria-pressed", "false");

      await button.click();

      expect(compareDocuments(before, editor.document)).toMatchInlineSnapshot(`
        "BEFORE:
        <block-selected path="1" type="paragraph" props={"textAlignment":"left"}>Selected text</block-selected>

        AFTER:
        <block-selected path="1" type="paragraph" props={"textAlignment":"justify"}>Selected text</block-selected>"
      `);
      await expect.element(button).toHaveAttribute("aria-pressed", "true");
    });

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
        props: viewProps,
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
        "BEFORE:
        <block-first path="0" type="paragraph" props={"textAlignment":"left"}>First</block-first>
        <block-second path="1" type="paragraph" props={"textAlignment":"left"}>Second</block-second>

        AFTER:
        <block-first path="0" type="paragraph" props={"textAlignment":"center"}>First</block-first>
        <block-second path="1" type="paragraph" props={"textAlignment":"center"}>Second</block-second>"
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
        props: viewProps,
        children: <TextAlignButton textAlignment="center" />,
      });
      const first = page.getByRole("cell", { name: "First", exact: true });
      const second = page.getByRole("cell", { name: "Second", exact: true });
      await expect.element(first).toBeVisible();
      await expect.element(second).toBeVisible();
      editor.focus();
      editor.transact((tr) => {
        const cells: number[] = [];
        tr.doc.descendants((node, pos) => {
          if (node.type.spec.tableRole === "cell") {
            cells.push(pos);
          }
        });
        tr.setSelection(CellSelection.create(tr.doc, cells[0], cells[1]));
      });
      await expect.element(first).toHaveClass("selectedCell");
      await expect.element(second).toHaveClass("selectedCell");
      // The alignment action shares and mutates table-cell props; detach the baseline.
      const before = structuredClone(editor.document);

      await page
        .getByRole("button", {
          name: editor.dictionary.formatting_toolbar.align_center.tooltip,
          exact: true,
        })
        .click();

      expect(compareDocuments(before, editor.document)).toMatchInlineSnapshot(`
        "BEFORE:
        <block-table path="0" type="table"><table columnWidths=[null,null] headerRows=undefined headerCols=undefined>
          <row index=0>
            <cell type="tableCell" props={"textAlignment":"left"}>First</cell>
            <cell type="tableCell" props={"textAlignment":"left"}>Second</cell>
          </row>
          <row index=1>
            <cell type="tableCell">Third</cell>
            <cell type="tableCell">Fourth</cell>
          </row>
        </table></block-table>

        AFTER:
        <block-table path="0" type="table"><table columnWidths=[null,null] headerRows=undefined headerCols=undefined>
          <row index=0>
            <cell type="tableCell" props={"textAlignment":"center"}>First</cell>
            <cell type="tableCell" props={"textAlignment":"center"}>Second</cell>
          </row>
          <row index=1>
            <cell type="tableCell">Third</cell>
            <cell type="tableCell">Fourth</cell>
          </row>
        </table></block-table>"
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
        props: viewProps,
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
        props: viewProps,
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
          props: viewProps,
          children: <TextAlignButton textAlignment={alignment} />,
        });
        editor.focus();
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
          props: viewProps,
          children: <TextAlignButton textAlignment="center" />,
        });
        editor.focus();
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
