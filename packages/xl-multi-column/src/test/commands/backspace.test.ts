import { describe, expect, it } from "vitest";

import { setupTestEnv } from "../setupTestEnv.js";
import { BlockNoteEditor } from "@blocknote/core";

const getEditor = setupTestEnv();

function pressBackspace(editor: BlockNoteEditor<any, any, any>) {
  const view = editor._tiptapEditor.view;
  const event = new KeyboardEvent("keydown", {
    key: "Backspace",
    code: "Backspace",
    keyCode: 8,
    bubbles: true,
  });
  view.someProp("handleKeyDown", (f: any) => f(view, event));
}

const threeColumnsWithParagraphBelow = [
  {
    type: "columnList" as const,
    children: [
      {
        type: "column" as const,
        children: [{ id: "col1-para", type: "paragraph" as const, content: "col1" }],
      },
      {
        type: "column" as const,
        children: [{ id: "col2-para", type: "paragraph" as const, content: "col2" }],
      },
      {
        type: "column" as const,
        children: [{ id: "col3-para", type: "paragraph" as const, content: "hello" }],
      },
    ],
  },
];

describe("Backspace with multi-column", () => {
  it("mid-text backspace next to columnList should not move block", () => {
    const editor = getEditor();
    editor.replaceBlocks(editor.document, [
      ...threeColumnsWithParagraphBelow,
      { id: "below-para", type: "paragraph" as const, content: "hello world" },
    ]);

    // Place cursor at offset 5 (after "hello", mid-text).
    editor.setTextCursorPosition("below-para", "start");
    const view = editor._tiptapEditor.view;
    const startPos = editor.transact((tr) => tr.selection.$from.pos);
    view.dispatch(
      view.state.tr.setSelection(
        (view.state.selection.constructor as any).create(view.state.doc, startPos + 5),
      ),
    );

    pressBackspace(editor);
    expect(editor.document).toMatchSnapshot();
  });

  it("backspace at block start should move block into last column", () => {
    const editor = getEditor();
    editor.replaceBlocks(editor.document, [
      ...threeColumnsWithParagraphBelow,
      { id: "below-para", type: "paragraph" as const, content: " world" },
    ]);

    editor.setTextCursorPosition("below-para", "start");
    pressBackspace(editor);
    expect(editor.document).toMatchSnapshot();
  });

  it("second backspace should merge into previous block in column", () => {
    const editor = getEditor();
    editor.replaceBlocks(editor.document, [
      ...threeColumnsWithParagraphBelow,
      { id: "below-para", type: "paragraph" as const, content: " world" },
    ]);

    editor.setTextCursorPosition("below-para", "start");
    pressBackspace(editor);
    pressBackspace(editor);
    expect(editor.document).toMatchSnapshot();
  });
});
