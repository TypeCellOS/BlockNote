import { describe, expect } from "vite-plus/test";

import { insertOrUpdateBlockForSlashMenu } from "./getDefaultSlashMenuItems.js";

describe("slash-menu block conversion (#2236)", () => {
  it("converts the existing paragraph to a quote at its start", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
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
    expect(editor.transact((tr) => tr.selection.empty)).toBe(true);
    expect(editor.transact((tr) => tr.selection.$from.parentOffset)).toBe(0);
  });

  it.for([
    { position: "middle", precedingText: "Existing" },
    { position: "end", precedingText: "Existing text" },
  ])(
    "inserts a new quote below when invoked at the paragraph's $position",
    async ({ precedingText }, { setupEditor, selectText }) => {
      const { editor } = await setupEditor({
        initialContent: [
          { id: "source", type: "paragraph", content: "Existing text" },
        ],
      });
      // The suggestion menu removes its slash/query before invoking the item.
      selectText(editor, precedingText, {
        startBlockId: "source",
      }).collapseToEnd();

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
      expect(editor.transact((tr) => tr.selection.empty)).toBe(true);
      expect(editor.transact((tr) => tr.selection.$from.parentOffset)).toBe(0);
    },
  );

  it("still inserts below when the item supplies replacement content", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
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

  it("enters a table replacing an empty paragraph before other content", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
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

  it("still inserts non-inline blocks below existing text", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
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
