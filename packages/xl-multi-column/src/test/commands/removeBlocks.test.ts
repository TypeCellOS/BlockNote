import { describe, expect } from "vite-plus/test";
import { multiColumnTestOptions, testEditorSchema } from "../setupTestEnv.js";

describe("Test removeBlocks", () => {
  it("Remove all blocks in column", async ({ setupEditor }) => {
    const { editor } = await setupEditor(multiColumnTestOptions);
    editor.removeBlocks(["column-paragraph-0", "column-paragraph-1"]);

    expect(editor.document).toMatchSnapshot();
  });

  it("Remove all blocks in second column", async ({ setupEditor }) => {
    const { editor } = await setupEditor(multiColumnTestOptions);
    editor.removeBlocks(["column-paragraph-2", "column-paragraph-3"]);

    expect(editor.document).toMatchSnapshot();
  });

  it("Remove all blocks in columns", async ({ setupEditor }) => {
    const { editor } = await setupEditor(multiColumnTestOptions);
    editor.removeBlocks([
      "column-paragraph-0",
      "column-paragraph-1",
      "column-paragraph-2",
      "column-paragraph-3",
    ]);

    expect(editor.document).toMatchSnapshot();
  });

  it("Remove column in columnList", async ({ setupEditor }) => {
    const { editor } = await setupEditor(multiColumnTestOptions);
    editor.removeBlocks(["column-0"]);

    expect(editor.document).toMatchSnapshot();
  });

  it("Remove all columns in columnList", async ({ setupEditor }) => {
    const { editor } = await setupEditor(multiColumnTestOptions);
    editor.removeBlocks(["column-0", "column-1"]);

    expect(editor.document).toMatchSnapshot();
  });

  it("Remove all blocks in column and block after", async ({ setupEditor }) => {
    const { editor } = await setupEditor(multiColumnTestOptions);
    editor.removeBlocks([
      "column-paragraph-0",
      "column-paragraph-1",
      "paragraph-2",
    ]);

    expect(editor.document).toMatchSnapshot();
  });

  it("Remove all blocks in columns and block after", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor(multiColumnTestOptions);
    editor.removeBlocks([
      "column-paragraph-0",
      "column-paragraph-1",
      "column-paragraph-2",
      "column-paragraph-3",
      "paragraph-2",
    ]);

    expect(editor.document).toMatchSnapshot();
  });

  it("Remove column in columnList and block after", async ({ setupEditor }) => {
    const { editor } = await setupEditor(multiColumnTestOptions);
    editor.removeBlocks(["column-0", "paragraph-2"]);

    expect(editor.document).toMatchSnapshot();
  });

  it("Remove all columns in columnList and block after", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor(multiColumnTestOptions);
    editor.removeBlocks(["column-0", "column-1", "paragraph-2"]);

    expect(editor.document).toMatchSnapshot();
  });

  it("Remove column and and block in column after", async ({ setupEditor }) => {
    const { editor } = await setupEditor(multiColumnTestOptions);
    editor.removeBlocks(["column-0", "column-paragraph-2"]);

    expect(editor.document).toMatchSnapshot();
  });

  // Removing the other column leaves the column list with one column, so it
  // dissolves and the surviving column's blocks are lifted out. That is an
  // unwrap of content that never moves, so a caret in it survives untouched.
  it("Keeps the cursor in place when removing a column dissolves the columnList", async ({
    setupEditor,
    selectText,
  }) => {
    const { editor } = await setupEditor(multiColumnTestOptions);
    selectText(editor, "Paragraph", {
      startBlockId: "column-paragraph-2",
    }).collapseToEnd();

    editor.removeBlocks(["column-0"]);

    expect(editor.getTextCursorPosition().block.id).toBe("column-paragraph-2");
    editor.insertInlineContent("!");
    expect(editor.getBlock("column-paragraph-2")?.content).toMatchObject([
      { type: "text", text: "Column Paragraph! 2" },
    ]);
  });

  // A block that is nested under a regular block cannot empty a column, so
  // removing it must not repair the column list. Here column 0 holds only an
  // empty paragraph, which the repair would otherwise remove.
  it("Keeps the column list when removing a nested block in a column", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      schema: testEditorSchema,
      initialContent: [
        {
          id: "cl",
          type: "columnList",
          children: [
            {
              id: "c0",
              type: "column",
              children: [{ id: "e", type: "paragraph" }],
            },
            {
              id: "c1",
              type: "column",
              children: [
                {
                  id: "a",
                  type: "paragraph",
                  content: "A",
                  children: [{ id: "n", type: "paragraph", content: "N" }],
                },
              ],
            },
          ],
        },
      ],
    });

    editor.removeBlocks(["n"]);

    const list = editor.getBlock("cl");
    expect(list?.type).toBe("columnList");
    expect(list?.children.map((column) => column.id)).toEqual(["c0", "c1"]);
  });
});
