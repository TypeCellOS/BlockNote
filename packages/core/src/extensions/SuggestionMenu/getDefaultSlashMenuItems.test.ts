// @vitest-environment node
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
  });

  it("still inserts below when invoked at the end of a non-empty paragraph", () => {
    editor = BlockNoteEditor.create({
      initialContent: [
        { id: "source", type: "paragraph", content: "Existing text" },
      ],
    });
    editor.setTextCursorPosition("source", "end");

    insertOrUpdateBlockForSlashMenu(editor, { type: "quote" });

    expect(editor.document.map((block) => block.type)).toEqual([
      "paragraph",
      "quote",
    ]);
    expect(editor.document[0].content).toEqual([
      { type: "text", text: "Existing text", styles: {} },
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
