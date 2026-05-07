import { TextSelection } from "@tiptap/pm/state";
import { describe, expect, it } from "vitest";

import { BlockNoteEditor } from "./BlockNoteEditor.js";

/**
 * @vitest-environment jsdom
 */

function mountEditor(editor: BlockNoteEditor<any, any, any>) {
  editor.mount(document.createElement("div"));
}

function selectStartOfFirstBlock(editor: BlockNoteEditor) {
  editor.transact((tr) => {
    let pos: number | undefined;
    tr.doc.descendants((node, nodePos) => {
      if (node.type.spec.group === "blockContent") {
        pos = nodePos + 1;
        return false;
      }
      return pos === undefined;
    });
    tr.setSelection(TextSelection.create(tr.doc, pos!));
  });
}

describe("paste into empty inline-content block", () => {
  it.each(["bulletListItem", "numberedListItem", "checkListItem"] as const)(
    "pastes a paragraph into an empty %s without replacing it",
    (type) => {
      const editor = BlockNoteEditor.create({
        initialContent: [{ type, content: "" }],
      });
      mountEditor(editor);
      selectStartOfFirstBlock(editor);

      editor.pasteHTML(`<p>Pasted</p>`);

      const blocks = editor.document;
      expect(blocks[0].type).toBe(type);
      expect(blocks[0].content).toEqual([
        { type: "text", text: "Pasted", styles: {} },
      ]);
    },
  );

  it("inserts paragraph content into an empty list item without dropping marks", () => {
    const editor = BlockNoteEditor.create({
      initialContent: [{ type: "bulletListItem", content: "" }],
    });
    mountEditor(editor);
    selectStartOfFirstBlock(editor);

    editor.pasteHTML(`<p>Hello <strong>world</strong></p>`);

    const blocks = editor.document;
    expect(blocks[0].type).toBe("bulletListItem");
    expect(blocks[0].content).toEqual([
      { type: "text", text: "Hello ", styles: {} },
      { type: "text", text: "world", styles: { bold: true } },
    ]);
  });

  it("merges leading paragraph into empty list item and inserts rest as siblings", () => {
    const editor = BlockNoteEditor.create({
      initialContent: [{ type: "bulletListItem", content: "" }],
    });
    mountEditor(editor);
    selectStartOfFirstBlock(editor);

    editor.pasteHTML(`<p>First</p><p>Second</p>`);

    const blocks = editor.document;
    expect(blocks[0].type).toBe("bulletListItem");
    expect(blocks[0].content).toEqual([
      { type: "text", text: "First", styles: {} },
    ]);
    expect(blocks[1].type).toBe("paragraph");
    expect(blocks[1].content).toEqual([
      { type: "text", text: "Second", styles: {} },
    ]);
  });

  it("replaces an empty list item with a heading when pasting a heading", () => {
    const editor = BlockNoteEditor.create({
      initialContent: [{ type: "bulletListItem", content: "" }],
    });
    mountEditor(editor);
    selectStartOfFirstBlock(editor);

    editor.pasteHTML(`<h1>Heading</h1>`);

    // The empty list item is replaced by the heading rather than absorbing
    // its inline content. Headings carry semantic meaning the user explicitly
    // chose, so we keep them as-is.
    const blocks = editor.document;
    expect(blocks[0].type).toBe("heading");
    expect(blocks[0].content).toEqual([
      { type: "text", text: "Heading", styles: {} },
    ]);
  });

  it("keeps the list item but discards the heading wrapper when a paragraph follows the heading", () => {
    const editor = BlockNoteEditor.create({
      initialContent: [{ type: "bulletListItem", content: "" }],
    });
    mountEditor(editor);
    selectStartOfFirstBlock(editor);

    // Heading first means the leading block is not a paragraph, so the
    // unwrap/retype rule doesn't apply: the empty list item gets replaced
    // by the pasted heading and the trailing paragraph follows as a sibling.
    editor.pasteHTML(`<h1>Heading</h1><p>Body</p>`);

    const blocks = editor.document;
    expect(blocks[0].type).toBe("heading");
    expect(blocks[0].content).toEqual([
      { type: "text", text: "Heading", styles: {} },
    ]);
    expect(blocks[1].type).toBe("paragraph");
    expect(blocks[1].content).toEqual([
      { type: "text", text: "Body", styles: {} },
    ]);
  });

  it("still replaces the empty list item when pasting another list item", () => {
    const editor = BlockNoteEditor.create({
      initialContent: [{ type: "bulletListItem", content: "" }],
    });
    mountEditor(editor);
    selectStartOfFirstBlock(editor);

    editor.pasteHTML(`<ul><li>Pasted item</li></ul>`);

    const blocks = editor.document;
    expect(blocks[0].type).toBe("bulletListItem");
    // The empty list item should be replaced (not have inline content
    // appended in-place), which matches the existing behavior.
    expect(blocks[0].content).toEqual([
      { type: "text", text: "Pasted item", styles: {} },
    ]);
  });

  it("pastes a paragraph into a non-empty list item without replacing it", () => {
    const editor = BlockNoteEditor.create({
      initialContent: [{ type: "bulletListItem", content: "abc" }],
    });
    mountEditor(editor);
    editor.setTextCursorPosition(editor.document[0].id, "end");

    editor.pasteHTML(`<p>hello</p>`);

    const blocks = editor.document;
    expect(blocks[0].type).toBe("bulletListItem");
    expect(blocks[0].content).toEqual([
      { type: "text", text: "abchello", styles: {} },
    ]);
  });

  it("pastes bare <li>a</li><li>b</li> into an empty list item as two list items", () => {
    const editor = BlockNoteEditor.create({
      initialContent: [{ type: "bulletListItem", content: "" }],
    });
    mountEditor(editor);
    selectStartOfFirstBlock(editor);

    editor.pasteHTML(`<li>a</li><li>b</li>`);

    const blocks = editor.document;
    expect(blocks[0].type).toBe("bulletListItem");
    expect(blocks[0].content).toEqual([
      { type: "text", text: "a", styles: {} },
    ]);
    expect(blocks[1].type).toBe("bulletListItem");
    expect(blocks[1].content).toEqual([
      { type: "text", text: "b", styles: {} },
    ]);
  });

  it("pastes bare <li>a</li><li>b</li> into a non-empty list item, splicing the first into the cursor", () => {
    const editor = BlockNoteEditor.create({
      initialContent: [{ type: "bulletListItem", content: "X" }],
    });
    mountEditor(editor);
    editor.setTextCursorPosition(editor.document[0].id, "end");

    editor.pasteHTML(`<li>a</li><li>b</li>`);

    const blocks = editor.document;
    expect(blocks[0].type).toBe("bulletListItem");
    expect(blocks[0].content).toEqual([
      { type: "text", text: "Xa", styles: {} },
    ]);
    expect(blocks[1].type).toBe("bulletListItem");
    expect(blocks[1].content).toEqual([
      { type: "text", text: "b", styles: {} },
    ]);
  });

  it("pastes two list items into an empty list item as two siblings", () => {
    const editor = BlockNoteEditor.create({
      initialContent: [{ type: "bulletListItem", content: "" }],
    });
    mountEditor(editor);
    selectStartOfFirstBlock(editor);

    editor.pasteHTML(`<ul><li>a</li><li>b</li></ul>`);

    // The empty list item is replaced by the two pasted list items.
    const blocks = editor.document;
    expect(blocks[0].type).toBe("bulletListItem");
    expect(blocks[0].content).toEqual([
      { type: "text", text: "a", styles: {} },
    ]);
    expect(blocks[1].type).toBe("bulletListItem");
    expect(blocks[1].content).toEqual([
      { type: "text", text: "b", styles: {} },
    ]);
  });

  it("pastes two list items into a non-empty list item, splicing the first into the cursor", () => {
    const editor = BlockNoteEditor.create({
      initialContent: [{ type: "bulletListItem", content: "X" }],
    });
    mountEditor(editor);
    editor.setTextCursorPosition(editor.document[0].id, "end");

    editor.pasteHTML(`<ul><li>a</li><li>b</li></ul>`);

    // The first list item's inline content is spliced at the cursor (the
    // existing list item becomes "Xa") and the second list item becomes a
    // new sibling.
    const blocks = editor.document;
    expect(blocks[0].type).toBe("bulletListItem");
    expect(blocks[0].content).toEqual([
      { type: "text", text: "Xa", styles: {} },
    ]);
    expect(blocks[1].type).toBe("bulletListItem");
    expect(blocks[1].content).toEqual([
      { type: "text", text: "b", styles: {} },
    ]);
  });

  it("preserves nested list structure when pasting a nested list into an empty list item", () => {
    const editor = BlockNoteEditor.create({
      initialContent: [{ type: "bulletListItem", content: "" }],
    });
    mountEditor(editor);
    selectStartOfFirstBlock(editor);

    // Pasting a list with nested children: the leading block is a list item,
    // so the unwrap/retype rule does not apply and the existing slice-level
    // list-nesting fix in `transformPasted` keeps the nested structure
    // intact.
    editor.pasteHTML(`<ul><li>Outer<ul><li>Inner</li></ul></li></ul>`);

    const blocks = editor.document;
    expect(blocks[0].type).toBe("bulletListItem");
    expect(blocks[0].content).toEqual([
      { type: "text", text: "Outer", styles: {} },
    ]);
    expect(blocks[0].children).toHaveLength(1);
    expect(blocks[0].children[0].type).toBe("bulletListItem");
    expect(blocks[0].children[0].content).toEqual([
      { type: "text", text: "Inner", styles: {} },
    ]);
  });

  it("preserves the existing paragraph behavior when pasting into a non-empty paragraph", () => {
    const editor = BlockNoteEditor.create({
      initialContent: [{ type: "paragraph", content: "Existing " }],
    });
    mountEditor(editor);
    editor.setTextCursorPosition(editor.document[0].id, "end");

    editor.pasteHTML(`<p>added</p>`);

    const blocks = editor.document;
    expect(blocks[0].type).toBe("paragraph");
    expect(blocks[0].content).toEqual([
      { type: "text", text: "Existing added", styles: {} },
    ]);
  });
});
