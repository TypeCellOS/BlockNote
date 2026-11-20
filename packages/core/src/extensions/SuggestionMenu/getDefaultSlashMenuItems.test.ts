// @vitest-environment node
import { TextSelection } from "@tiptap/pm/state";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { insertOrUpdateBlockForSlashMenu } from "./getDefaultSlashMenuItems.js";

let editor: BlockNoteEditor | undefined;

afterEach(() => {
  editor?._tiptapEditor.destroy();
});

describe("slash-menu block conversion (#2236)", () => {
  it("converts the existing paragraph to a quote at its start", () => {
    editor = BlockNoteEditor.create({
      initialContent: [
        { id: "source", type: "paragraph", content: "Existing text" },
      ],
    });
    // The suggestion menu removes its slash/query before invoking the item.
    editor.setTextCursorPosition("source", "start");

    insertOrUpdateBlockForSlashMenu(editor, { type: "quote" });

    expect(editor.document).toHaveLength(1);
    expect(editor.document[0]).toMatchObject({
      id: "source",
      type: "quote",
      content: [{ type: "text", text: "Existing text", styles: {} }],
    });
    expect(editor.getTextCursorPosition().block.id).toBe("source");
    expect(editor.prosemirrorState.selection.empty).toBe(true);
    expect(editor.prosemirrorState.selection.$from.parentOffset).toBe(0);
  });

  it.each([
    ["middle", 8],
    ["end", 13],
  ] as const)(
    "inserts a new quote below when invoked at the paragraph's %s",
    (_position, offset) => {
      editor = BlockNoteEditor.create({
        initialContent: [
          { id: "source", type: "paragraph", content: "Existing text" },
        ],
      });
      // The suggestion menu removes its slash/query before invoking the item.
      editor.setTextCursorPosition("source", "start");
      editor.transact((tr) =>
        tr.setSelection(
          TextSelection.create(tr.doc, tr.selection.from + offset),
        ),
      );

      insertOrUpdateBlockForSlashMenu(editor, { type: "quote" });

      expect(editor.document).toHaveLength(2);
      expect(editor.document[0]).toMatchObject({
        id: "source",
        type: "paragraph",
        content: [{ type: "text", text: "Existing text", styles: {} }],
      });
      expect(editor.document[1]).toMatchObject({ type: "quote", content: [] });
      expect(editor.getTextCursorPosition().block.id).toBe(
        editor.document[1].id,
      );
      expect(editor.prosemirrorState.selection.empty).toBe(true);
      expect(editor.prosemirrorState.selection.$from.parentOffset).toBe(0);
    },
  );

  it("still inserts below when the item supplies replacement content", () => {
    editor = BlockNoteEditor.create({
      initialContent: [
        { id: "source", type: "paragraph", content: "Existing text" },
      ],
    });
    editor.setTextCursorPosition("source", "start");

    insertOrUpdateBlockForSlashMenu(editor, {
      type: "quote",
      content: "New text",
    });

    expect(editor.document.map((block) => block.type)).toEqual([
      "paragraph",
      "quote",
    ]);
    expect(editor.document[0].content).toEqual([
      { type: "text", text: "Existing text", styles: {} },
    ]);
    expect(editor.document[1].content).toEqual([
      { type: "text", text: "New text", styles: {} },
    ]);
  });

  it("enters a table replacing an empty paragraph before other content", () => {
    editor = BlockNoteEditor.create({
      initialContent: [
        { id: "source", type: "paragraph" },
        { id: "following", type: "paragraph", content: "Following text" },
      ],
    });
    editor.setTextCursorPosition("source", "start");

    insertOrUpdateBlockForSlashMenu(editor, {
      type: "table",
      content: { type: "tableContent", rows: [{ cells: ["Cell"] }] },
    });

    expect(editor.getTextCursorPosition().block).toMatchObject({
      id: "source",
      type: "table",
    });
  });

  it("still inserts non-inline blocks below existing text", () => {
    editor = BlockNoteEditor.create({
      initialContent: [
        { id: "source", type: "paragraph", content: "Existing text" },
      ],
    });
    editor.setTextCursorPosition("source", "start");

    insertOrUpdateBlockForSlashMenu(editor, { type: "divider" });

    expect(editor.document.slice(0, 2).map((block) => block.type)).toEqual([
      "paragraph",
      "divider",
    ]);
    expect(editor.document[0].content).toEqual([
      { type: "text", text: "Existing text", styles: {} },
    ]);
  });
});
