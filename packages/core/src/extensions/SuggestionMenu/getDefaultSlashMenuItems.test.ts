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
  it.each([
    ["start", 0],
    ["middle", 8],
    ["end", 13],
  ] as const)(
    "converts the existing paragraph to a quote at its %s",
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

      expect(editor.document).toHaveLength(1);
      expect(editor.document[0]).toMatchObject({
        id: "source",
        type: "quote",
        content: [{ type: "text", text: "Existing text", styles: {} }],
      });
      expect(editor.getTextCursorPosition().block.id).toBe("source");
      expect(editor.prosemirrorState.selection.empty).toBe(true);
      expect(editor.prosemirrorState.selection.$from.parentOffset).toBe(offset);
    },
  );

  it("still inserts below when the item supplies replacement content", () => {
    editor = BlockNoteEditor.create({
      initialContent: [
        { id: "source", type: "paragraph", content: "Existing text" },
      ],
    });
    editor.setTextCursorPosition("source", "end");

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
