import { describe, expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "@blocknote/core";

import { setupTestEnv } from "../setupTestEnv.js";

const getEditor = setupTestEnv();

function pressEnter(editor: BlockNoteEditor<any, any, any>) {
  const view = editor._tiptapEditor.view;
  const event = new KeyboardEvent("keydown", {
    key: "Enter",
    code: "Enter",
    keyCode: 13,
    bubbles: true,
  });
  view.someProp("handleKeyDown", (f: any) => f(view, event));
}

// Columns have no special Enter config: like any non-sealed container, an
// empty last block escapes on Enter. The generic mechanics (escape, ascent
// past levels that can't hold the block, mid-container stays) are covered in
// core's `containers.browser.test.ts`; these two tests use the real column
// schema and its interaction with the column-list repair.
describe("Enter exit from columns", () => {
  it("typing then double-Enter escapes in two presses", () => {
    const editor = getEditor();
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
    pressEnter(editor);

    // First press: a new empty block inside the column.
    expect(editor.document.map((block) => block.id)).toEqual(["cl-0"]);
    const children = editor.getBlock("col-2")!.children;
    expect(children).toHaveLength(2);
    const created = children[1].id;
    expect(editor.getTextCursorPosition().block.id).toBe(created);

    pressEnter(editor);

    // Second press: that block moves below the column list (a block can't sit
    // between columns, so the escape lands below the whole list), caret along.
    expect(editor.getBlock("col-2")!.children.map((child) => child.id)).toEqual(
      ["col2-para"],
    );
    expect(editor.document.map((block) => block.id)).toEqual(["cl-0", created]);
    expect(editor.getTextCursorPosition().block.id).toBe(created);
  });

  it("escaping a column's only block dissolves it and unwraps the list", () => {
    // The exit empties the column, so the column list's `whenEmptied: "unwrap"`
    // repair kicks in: the emptied column disappears, and the one-column
    // list unwraps to the surviving column's blocks.
    const editor = getEditor();
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
    pressEnter(editor);

    expect(editor.document.map((block) => block.id)).toEqual([
      "col1-para",
      "col2-empty",
    ]);
  });
});
