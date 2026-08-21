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

// Columns have no special Enter config: like any non-sealed container, an empty
// *last* block escapes on Enter ("double-Enter escapes"). A column list only
// holds columns, so the escaping block can't stop at the column-list level —
// it lands below the whole list.
describe("Enter exit from columns", () => {
  it("moves an empty last block of the last column below the column list", () => {
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
            children: [
              { id: "col2-para", type: "paragraph", content: "col2" },
              { id: "col2-empty", type: "paragraph", content: "" },
            ],
          },
        ],
      },
      { id: "trailing", type: "paragraph", content: "trailing" },
    ]);

    editor.setTextCursorPosition("col2-empty", "end");
    pressEnter(editor);

    expect(editor.getBlock("col-2")!.children.map((child) => child.id)).toEqual(
      ["col2-para"],
    );
    expect(editor.document.map((block) => block.id)).toEqual([
      "cl-0",
      "col2-empty",
      "trailing",
    ]);
    // The caret came along, so typing continues below the column list.
    expect(editor.getTextCursorPosition().block.id).toBe("col2-empty");
  });

  it("moves an empty last block of a non-last column below the column list too", () => {
    // Blocks can't sit between columns, so the escape from any column lands
    // below the whole list.
    const editor = getEditor();
    editor.replaceBlocks(editor.document, [
      {
        type: "columnList",
        id: "cl-0",
        children: [
          {
            type: "column",
            id: "col-1",
            children: [
              { id: "col1-para", type: "paragraph", content: "col1" },
              { id: "col1-empty", type: "paragraph", content: "" },
            ],
          },
          {
            type: "column",
            id: "col-2",
            children: [{ id: "col2-para", type: "paragraph", content: "col2" }],
          },
        ],
      },
    ]);

    editor.setTextCursorPosition("col1-empty", "end");
    pressEnter(editor);

    expect(editor.getBlock("col-1")!.children.map((child) => child.id)).toEqual(
      ["col1-para"],
    );
    expect(editor.getBlock("col-2")!.children.map((child) => child.id)).toEqual(
      ["col2-para"],
    );
    expect(editor.document.map((block) => block.id)).toEqual([
      "cl-0",
      "col1-empty",
    ]);
  });

  it("keeps an empty block mid-column inside on Enter", () => {
    // The escape gesture is strictly "at the end of the column": an empty
    // block with a sibling after it never ejects.
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
            children: [
              { id: "col2-empty", type: "paragraph", content: "" },
              { id: "col2-para", type: "paragraph", content: "col2" },
            ],
          },
        ],
      },
    ]);

    editor.setTextCursorPosition("col2-empty", "end");
    pressEnter(editor);

    expect(editor.document.map((block) => block.id)).toEqual(["cl-0"]);
    expect(editor.getBlock("col-2")!.children).toHaveLength(3);
    expect(
      editor.getBlock("col-2")!.children.map((child) => child.content),
    ).toEqual([[], [], [{ type: "text", text: "col2", styles: {} }]]);
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

  it("typing then double-Enter escapes in two presses", () => {
    // The end-to-end gesture: the first Enter creates the empty trailing
    // block inside the column, the second moves it out.
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

    // Second press: that block moves below the column list.
    expect(editor.getBlock("col-2")!.children.map((child) => child.id)).toEqual(
      ["col2-para"],
    );
    expect(editor.document.map((block) => block.id)).toEqual(["cl-0", created]);
  });
});
