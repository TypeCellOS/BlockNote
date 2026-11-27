import { CellSelection } from "@tiptap/pm/tables";
import { describe, expect } from "vite-plus/test";
import { FormattingToolbar } from "../FormattingToolbar.js";
import { TextAlignButton } from "./TextAlignButton.js";
import { viewProps } from "./defaultButton.test.fixture.js";
import { TableHandlesExtension } from "@blocknote/core/extensions";

function AlignmentControls() {
  return (
    <FormattingToolbar>
      {(["left", "center", "right"] as const).map((textAlignment) => (
        <TextAlignButton key={textAlignment} textAlignment={textAlignment} />
      ))}
    </FormattingToolbar>
  );
}

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
    it.for(["ltr", "rtl"] as const)(
      "%s left/right align to logical start/end with matching labels",
      async (dir, { setupEditor, page }) => {
        const { editor, rootNode } = await setupEditor({
          initialContent: [
            { id: "text", type: "paragraph", content: "שלום — مرحباً (123)" },
          ],
          props: { ...viewProps, dir },
          children: <AlignmentControls />,
        });
        editor.setTextCursorPosition("text");
        const start = page.getByRole("button", {
          name: editor.dictionary.formatting_toolbar[
            dir === "rtl" ? "align_right" : "align_left"
          ].tooltip,
          exact: true,
        });
        const end = page.getByRole("button", {
          name: editor.dictionary.formatting_toolbar[
            dir === "rtl" ? "align_left" : "align_right"
          ].tooltip,
          exact: true,
        });
        await expect.element(start).toHaveAttribute("aria-pressed", "true");
        function textX() {
          const range = document.createRange();
          range.selectNodeContents(
            rootNode.querySelector(".bn-inline-content")!,
          );
          return range.getBoundingClientRect().left;
        }
        const naturalX = textX();
        await end.click();
        expect(editor.getBlock("text")?.props).toMatchObject({
          textAlignment: "right",
        });
        await expect
          .poll(() => (textX() - naturalX) * (dir === "rtl" ? -1 : 1))
          .toBeGreaterThan(100);
        await start.click();
        await expect.poll(() => Math.abs(textX() - naturalX)).toBeLessThan(1);
      },
    );

    it("follows the selected table cell and preserves the caret and mixed cell selection", async ({
      setupEditor,
      page,
      userEvent,
    }) => {
      const { editor, rootNode } = await setupEditor({
        initialContent: [
          {
            id: "table",
            type: "table",
            content: {
              type: "tableContent",
              rows: [
                {
                  cells: [
                    { type: "tableCell", content: "First" },
                    {
                      type: "tableCell",
                      content: "שלום",
                      props: { textAlignment: "right" },
                    },
                  ],
                },
              ],
            },
          },
        ],
        props: { ...viewProps, dir: "rtl" },
        children: <AlignmentControls />,
      });
      const start = page.getByRole("button", {
        name: editor.dictionary.formatting_toolbar.align_right.tooltip,
        exact: true,
      });
      const end = page.getByRole("button", {
        name: editor.dictionary.formatting_toolbar.align_left.tooltip,
        exact: true,
      });
      await page.getByRole("cell", { name: "שלום", exact: true }).click();
      await expect.element(end).toHaveAttribute("aria-pressed", "true");
      await start.click();
      await expect.element(start).toHaveAttribute("aria-pressed", "true");
      await userEvent.keyboard("X");
      expect(rootNode.querySelectorAll("td p")[0].textContent).toBe("First");
      expect(rootNode.querySelectorAll("td p")[1].textContent).toContain("X");
      const tables = editor.getExtension(TableHandlesExtension)!;
      await end.click();
      editor.exec((state, dispatch) => {
        dispatch?.(
          tables.setCellSelection(state, { row: 0, col: 0 }, { row: 0, col: 1 })
            .tr,
        );
        return true;
      });
      await expect.element(start).toHaveAttribute("aria-pressed", "false");
      await expect.element(end).toHaveAttribute("aria-pressed", "false");
      await start.click();
      await expect.element(start).toHaveAttribute("aria-pressed", "true");
      expect(tables.getCellSelection()?.cells).toHaveLength(2);
    });

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
    it.for(["left", "center", "right", "justify"] as const)(
      "checks the %s alignment button",
      async (alignment, { setupEditor, runAxe, page }) => {
        const { editor } = await setupEditor({
          props: viewProps,
          children: <TextAlignButton textAlignment={alignment} />,
        });
        const button = page.getByRole("button", {
          name: editor.dictionary.formatting_toolbar[`align_${alignment}`]
            .tooltip,
          exact: true,
        });
        await expect.element(button).toBeVisible();
        expect((await runAxe(button)).violations).toEqual([]);
      },
    );
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
