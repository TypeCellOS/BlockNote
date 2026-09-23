import { GapCursor } from "@tiptap/pm/gapcursor";
import { NodeSelection, TextSelection } from "prosemirror-state";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";

const editors: BlockNoteEditor[] = [];

afterEach(() => {
  for (const editor of editors) {
    editor._tiptapEditor.destroy();
  }
  editors.length = 0;
});

function createEditor(gapCursor?: boolean, trailingBlock = true) {
  const editor = BlockNoteEditor.create({
    gapCursor,
    trailingBlock,
    initialContent: [
      { id: "first", type: "image" },
      { id: "second", type: "file" },
      { id: "text", type: "paragraph", content: "hello" },
      { id: "last", type: "image" },
    ],
  });
  editor.mount(document.createElement("div"));
  editors.push(editor);
  return editor;
}

function pressKey(editor: BlockNoteEditor, key: "ArrowUp" | "ArrowDown") {
  const view = editor.prosemirrorView;
  const event = new KeyboardEvent("keydown", {
    key,
    keyCode: key === "ArrowUp" ? 38 : 40,
    bubbles: true,
    cancelable: true,
  });
  // Dispatch through the DOM so ProseMirror's built-in keyboard handling runs
  // after plugin handlers, just as it does for a real key press.
  view.dom.dispatchEvent(event);
  return event.defaultPrevented;
}

describe("gap cursor configuration", () => {
  it.each([undefined, true])(
    "preserves gap navigation when gapCursor is %s",
    (gapCursor) => {
      const editor = createEditor(gapCursor);
      editor.setTextCursorPosition("first");
      pressKey(editor, "ArrowDown");
      expect(editor.prosemirrorState.selection).toBeInstanceOf(GapCursor);
    },
  );

  it.each([
    ["first", "ArrowDown", "second"],
    ["second", "ArrowUp", "first"],
  ] as const)("moves directly from %s with %s", (from, key, to) => {
    const editor = createEditor(false);
    const doc = editor.prosemirrorState.doc;
    editor.setTextCursorPosition(from);
    expect(pressKey(editor, key)).toBe(true);
    expect(editor.prosemirrorState.selection).toBeInstanceOf(NodeSelection);
    expect(editor.getTextCursorPosition().block.id).toBe(to);
    expect(editor.prosemirrorState.doc.eq(doc)).toBe(true);
    expect(
      editor.prosemirrorView.dom.querySelector(".ProseMirror-gapcursor"),
    ).toBeNull();
  });

  it.each([
    ["second", "ArrowDown", "start"],
    ["last", "ArrowUp", "end"],
  ] as const)("moves from %s into adjacent text", (from, key, placement) => {
    const editor = createEditor(false);
    editor.setTextCursorPosition("text", placement);
    const expected = editor.prosemirrorState.selection;
    editor.setTextCursorPosition(from);
    pressKey(editor, key);
    expect(editor.prosemirrorState.selection).toBeInstanceOf(TextSelection);
    expect(editor.prosemirrorState.selection.eq(expected)).toBe(true);
  });

  it.each([true, false])(
    "stays at document boundaries with trailingBlock=%s",
    (trailingBlock) => {
      const editor = createEditor(false, trailingBlock);
      const doc = editor.prosemirrorState.doc;
      for (const [id, key] of [
        ["first", "ArrowUp"],
        ["last", "ArrowDown"],
      ] as const) {
        editor.setTextCursorPosition(id);
        const selection = editor.prosemirrorState.selection;
        // Repeated presses must neither move the selection nor add a block.
        expect(pressKey(editor, key)).toBe(true);
        expect(pressKey(editor, key)).toBe(true);
        expect(editor.prosemirrorState.selection.eq(selection)).toBe(true);
        expect(editor.prosemirrorState.doc.eq(doc)).toBe(true);
      }
    },
  );

  it("navigates into and out of nested blocks", () => {
    const editor = createEditor(false);
    editor.updateBlock("first", { children: [{ id: "child", type: "image" }] });
    editor.setTextCursorPosition("first");
    const doc = editor.prosemirrorState.doc;
    for (const [key, id] of [
      ["ArrowDown", "child"],
      ["ArrowDown", "second"],
      ["ArrowUp", "child"],
      ["ArrowUp", "first"],
    ] as const) {
      expect(pressKey(editor, key)).toBe(true);
      expect(editor.getTextCursorPosition().block.id).toBe(id);
      expect(editor.prosemirrorState.selection).toBeInstanceOf(NodeSelection);
    }
    expect(editor.prosemirrorState.doc.eq(doc)).toBe(true);
  });
});
