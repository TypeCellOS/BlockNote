import { describe, expect } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";

import { multiColumnTestOptions } from "../setupTestEnv.js";

// Columns set `emptyChildEnter: "stay"`: Enter in an empty column block adds
// another block in the column, as on `main` and in Notion, instead of the
// layout block default where an empty last block leaves the layout block. The
// generic exit mechanics are covered in core's `layoutBlocks.browser.test.ts`.
describe("Enter in columns", () => {
  it("adds blocks in the column and never leaves it", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      mountType: "dom",
      ...multiColumnTestOptions,
    });
    editor.replaceBlocks(editor.document, [
      {
        type: "columnList",
        id: "cl-0",
        children: [
          {
            type: "column",
            id: "col-1",
            children: [{ id: "col1-para", type: "paragraph", content: "col1" }],
          },
          {
            type: "column",
            id: "col-2",
            children: [{ id: "col2-para", type: "paragraph", content: "col2" }],
          },
        ],
      },
    ]);

    editor.setTextCursorPosition("col2-para", "end");
    editor.focus();
    await userEvent.keyboard("{Enter}");

    // First press: a new empty block inside the column.
    expect(editor.document.map((block) => block.id)).toEqual(["cl-0"]);
    const created = editor.getBlock("col-2")!.children[1].id;
    expect(editor.getBlock("col-2")!.children).toHaveLength(2);
    expect(editor.getTextCursorPosition().block.id).toBe(created);

    await userEvent.keyboard("{Enter}");

    // Second press, in the empty block: another block in the column, caret
    // in it, instead of leaving the column list.
    const children = editor.getBlock("col-2")!.children;
    expect(children.map((child) => child.id).slice(0, 2)).toEqual([
      "col2-para",
      created,
    ]);
    expect(children).toHaveLength(3);
    expect(editor.document.map((block) => block.id)).toEqual(["cl-0"]);
    expect(editor.getTextCursorPosition().block.id).toBe(children[2].id);
  });

  it("adds a block after a column's only empty block, keeping the column", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      mountType: "dom",
      ...multiColumnTestOptions,
    });
    editor.replaceBlocks(editor.document, [
      {
        type: "columnList",
        id: "cl-0",
        children: [
          {
            type: "column",
            id: "col-1",
            children: [{ id: "col1-para", type: "paragraph", content: "col1" }],
          },
          {
            type: "column",
            id: "col-2",
            children: [{ id: "col2-empty", type: "paragraph", content: "" }],
          },
        ],
      },
    ]);

    editor.setTextCursorPosition("col2-empty", "end");
    editor.focus();
    await userEvent.keyboard("{Enter}");

    expect(editor.document.map((block) => block.id)).toEqual(["cl-0"]);
    const children = editor.getBlock("col-2")!.children;
    expect(children).toHaveLength(2);
    expect(children[0].id).toBe("col2-empty");
    expect(editor.getTextCursorPosition().block.id).toBe(children[1].id);
  });
});
