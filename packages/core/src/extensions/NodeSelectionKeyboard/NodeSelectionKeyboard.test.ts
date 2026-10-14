import { GapCursor } from "@tiptap/pm/gapcursor";
import { NodeSelection, TextSelection } from "prosemirror-state";
import { afterEach, describe, expect, it } from "vite-plus/test";

import type { PartialBlock } from "../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";

const editors: BlockNoteEditor[] = [];

afterEach(() => {
  for (const editor of editors) {
    editor._tiptapEditor.destroy();
  }
  editors.length = 0;
});

function createEditor(initialContent: PartialBlock[], trailingBlock = true) {
  const editor = BlockNoteEditor.create({ initialContent, trailingBlock });
  editor.mount(document.createElement("div"));
  editors.push(editor);
  return editor;
}

function pressKey(
  editor: BlockNoteEditor,
  key: "ArrowUp" | "ArrowDown" | "ArrowRight",
  modifiers: KeyboardEventInit = {},
) {
  const event = new KeyboardEvent("keydown", {
    key,
    keyCode: { ArrowUp: 38, ArrowDown: 40, ArrowRight: 39 }[key],
    bubbles: true,
    cancelable: true,
    ...modifiers,
  });
  // Include ProseMirror's built-in handling as well as the plugin handlers.
  editor.prosemirrorView.dom.dispatchEvent(event);
  return event.defaultPrevented;
}

describe("ArrowDown after a selected contentless block", () => {
  it.each(["image", "file", "video", "audio"] as const)(
    "creates and selects a paragraph after a final %s",
    (type) => {
      const editor = createEditor([{ id: "last", type }]);
      editor.setTextCursorPosition("last");
      const original = editor.document[0];

      expect(pressKey(editor, "ArrowDown")).toBe(true);

      expect(editor.document).toHaveLength(2);
      expect(editor.document[0]).toEqual(original);
      expect(editor.document[1]).toMatchObject({
        type: "paragraph",
        content: [],
      });
      expect(editor.getTextCursorPosition().block.id).toBe(
        editor.document[1].id,
      );
      expect(editor.prosemirrorState.selection).toBeInstanceOf(TextSelection);
      expect(editor.prosemirrorState.selection.$from.parentOffset).toBe(0);
      expect(editor.prosemirrorState.selection.empty).toBe(true);

      pressKey(editor, "ArrowDown");
      expect(editor.document).toHaveLength(2);
    },
  );

  it("works with the trailing block decoration disabled", () => {
    const editor = createEditor([{ id: "last", type: "image" }], false);
    editor.setTextCursorPosition("last");
    pressKey(editor, "ArrowDown");
    expect(editor.document).toHaveLength(2);
    expect(editor.getTextCursorPosition().block.type).toBe("paragraph");
  });

  it("inserts after a final nested block at the same nesting level", () => {
    const editor = createEditor([
      {
        id: "parent",
        type: "paragraph",
        content: "parent",
        children: [{ id: "last", type: "image" }],
      },
    ]);
    editor.setTextCursorPosition("last");
    pressKey(editor, "ArrowDown");
    expect(editor.document).toHaveLength(1);
    const children = editor.document[0].children;
    expect(children).toHaveLength(2);
    expect(children[1]).toMatchObject({ type: "paragraph", content: [] });
    expect(editor.getTextCursorPosition().block.id).toBe(children[1].id);
  });

  it.each(["image", "paragraph"] as const)(
    "does not insert when a %s follows",
    (type) => {
      const editor = createEditor([
        { id: "first", type: "image" },
        { id: "next", type },
      ]);
      editor.setTextCursorPosition("first");
      const doc = editor.document;
      pressKey(editor, "ArrowDown");
      expect(editor.document).toEqual(doc);
    },
  );

  it("does not insert when the selected block has children", () => {
    const editor = createEditor([
      {
        id: "parent",
        type: "image",
        children: [{ id: "child", type: "image" }],
      },
    ]);
    editor.setTextCursorPosition("parent");
    const doc = editor.document;
    pressKey(editor, "ArrowDown");
    expect(editor.document).toEqual(doc);
  });

  it.each(["", "hello"])(
    "does not append after a text cursor in a paragraph containing %j",
    (content) => {
      const editor = createEditor([{ id: "last", type: "paragraph", content }]);
      editor.setTextCursorPosition("last", "end");
      const doc = editor.document;
      pressKey(editor, "ArrowDown");
      expect(editor.document).toEqual(doc);
    },
  );

  it("does not append after a node-selected block with inline content", () => {
    const editor = createEditor([
      { id: "last", type: "paragraph", content: "hello" },
    ]);
    editor.setTextCursorPosition("last");
    editor.transact((tr) =>
      tr.setSelection(
        NodeSelection.create(tr.doc, tr.selection.$from.before()),
      ),
    );
    const doc = editor.document;
    pressKey(editor, "ArrowDown");
    expect(editor.document).toEqual(doc);
  });

  it.each([
    { shiftKey: true },
    { altKey: true },
    { ctrlKey: true },
    { metaKey: true },
    { isComposing: true },
  ])(
    "does not insert for modified or composing key presses: %j",
    (modifiers) => {
      const editor = createEditor([{ id: "last", type: "image" }]);
      editor.setTextCursorPosition("last");
      const doc = editor.document;
      pressKey(editor, "ArrowDown", modifiers);
      expect(editor.document).toEqual(doc);
    },
  );

  it.each(["ArrowUp", "ArrowRight"] as const)(
    "does not insert a paragraph for %s",
    (key) => {
      const editor = createEditor([{ id: "last", type: "image" }]);
      editor.setTextCursorPosition("last");
      const doc = editor.document;
      pressKey(editor, key);
      if (key === "ArrowUp") {
        expect(editor.prosemirrorState.selection).toBeInstanceOf(GapCursor);
      }
      expect(editor.document).toEqual(doc);
    },
  );

  it("preserves gap cursors between contentless blocks", () => {
    const editor = createEditor([
      { id: "first", type: "image" },
      { id: "last", type: "file" },
    ]);
    editor.setTextCursorPosition("first");
    pressKey(editor, "ArrowDown");
    expect(editor.prosemirrorState.selection).toBeInstanceOf(GapCursor);
    expect(editor.document).toHaveLength(2);
  });
});
