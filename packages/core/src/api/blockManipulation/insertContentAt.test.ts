import { describe, expect, it } from "vitest";
import type { Transaction } from "prosemirror-state";

import { setupTestEnv } from "./setupTestEnv.js";
import { insertContentAt } from "./insertContentAt.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { inlineContentToNodes } from "../nodeConversions/blockToNode.js";
import { getPmSchema } from "../pmUtil.js";
import { resolveLocationToPM } from "../../locations/location.js";
import type { Location } from "../../locations/types.js";

const getEditor = setupTestEnv();

function insertContentAtPosition(
  editor: BlockNoteEditor,
  position: number | { from: number; to: number },
  content: string | any[],
  options: { updateSelection: boolean } = { updateSelection: true },
) {
  return editor.transact((tr: Transaction) => {
    const pmSchema = getPmSchema(tr);
    const nodes =
      typeof content === "string"
        ? [pmSchema.text(content)]
        : inlineContentToNodes(content, pmSchema);

    return insertContentAt(tr, position, nodes, options);
  });
}

function insertContentAtLocation(
  editor: BlockNoteEditor,
  location: Location,
  content: string | any[],
  options: { updateSelection: boolean } = { updateSelection: true },
) {
  return editor.transact((tr: Transaction) => {
    const pmSchema = getPmSchema(tr);
    const nodes =
      typeof content === "string"
        ? [pmSchema.text(content)]
        : inlineContentToNodes(content, pmSchema);

    const range = resolveLocationToPM(tr.doc, location);

    return insertContentAt(
      tr,
      { from: range.anchor, to: range.head },
      nodes,
      options,
    );
  });
}

describe("Test insertContentAt", () => {
  it("Insert plain text at position", () => {
    expect(
      insertContentAtPosition(getEditor(), 5, "inserted text"),
    ).toMatchSnapshot();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert plain text at range position", () => {
    expect(
      insertContentAtPosition(getEditor(), { from: 5, to: 10 }, "replaced"),
    ).toMatchSnapshot();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert plain text with updateSelection false", () => {
    expect(
      insertContentAtPosition(getEditor(), 5, "inserted text", {
        updateSelection: false,
      }),
    ).toMatchSnapshot();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert styled text content", () => {
    expect(
      insertContentAtPosition(getEditor(), 5, [
        { type: "text", text: "bold text", styles: { bold: true } },
        { type: "text", text: " and ", styles: {} },
        { type: "text", text: "italic text", styles: { italic: true } },
      ]),
    ).toMatchSnapshot();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert multiple text nodes", () => {
    const editor = getEditor();

    expect(
      editor.transact((tr) => {
        const pmSchema = getPmSchema(tr);
        return insertContentAt(tr, 5, [
          pmSchema.text("first "),
          pmSchema.text("second "),
          pmSchema.text("third"),
        ]);
      }),
    ).toMatchSnapshot();

    expect(editor.document).toMatchSnapshot();
  });

  it("Insert text with marks", () => {
    const editor = getEditor();

    expect(
      editor.transact((tr) => {
        const pmSchema = getPmSchema(tr);
        const boldMark = pmSchema.marks.bold.create();
        return insertContentAt(tr, 5, [pmSchema.text("bold text", [boldMark])]);
      }),
    ).toMatchSnapshot();

    expect(editor.document).toMatchSnapshot();
  });

  it("Insert block content (paragraph) at position", () => {
    const editor = getEditor();

    expect(
      editor.transact((tr) => {
        const pmSchema = getPmSchema(tr);
        // Create a paragraph node
        const paragraphNode = pmSchema.nodes.paragraph.createChecked({}, [
          pmSchema.text("New paragraph content"),
        ]);
        return insertContentAt(tr, 5, [paragraphNode]);
      }),
    ).toMatchSnapshot();

    expect(editor.document).toMatchSnapshot();
  });

  it("Insert block content (heading) at position", () => {
    const editor = getEditor();

    expect(
      editor.transact((tr) => {
        const pmSchema = getPmSchema(tr);
        // Create a heading node
        const headingNode = pmSchema.nodes.heading.createChecked({ level: 2 }, [
          pmSchema.text("New heading"),
        ]);
        return insertContentAt(tr, 5, [headingNode]);
      }),
    ).toMatchSnapshot();

    expect(editor.document).toMatchSnapshot();
  });

  it("Insert multiple block nodes", () => {
    const editor = getEditor();

    expect(
      editor.transact((tr) => {
        const pmSchema = getPmSchema(tr);
        const paragraphNode1 = pmSchema.nodes.paragraph.createChecked({}, [
          pmSchema.text("First paragraph"),
        ]);
        const paragraphNode2 = pmSchema.nodes.paragraph.createChecked({}, [
          pmSchema.text("Second paragraph"),
        ]);
        return insertContentAt(tr, 5, [paragraphNode1, paragraphNode2]);
      }),
    ).toMatchSnapshot();

    expect(editor.document).toMatchSnapshot();
  });

  it("Replace empty paragraph with block content", () => {
    const editor = getEditor();

    // Find the empty paragraph position
    const emptyParagraphPos = editor.document.findIndex(
      (block) => block.id === "empty-paragraph",
    );

    if (emptyParagraphPos === -1) {
      throw new Error("Empty paragraph not found in test document");
    }

    // Get the position in the ProseMirror document
    const pmPos = editor.prosemirrorState.doc
      .resolve(emptyParagraphPos)
      .start();

    expect(
      editor.transact((tr) => {
        const pmSchema = getPmSchema(tr);
        // Create an image node to replace the empty paragraph
        const imageNode = pmSchema.nodes.image.createChecked({
          url: "https://example.com/image.jpg",
        });
        return insertContentAt(tr, pmPos, [imageNode]);
      }),
    ).toMatchSnapshot();

    expect(editor.document).toMatchSnapshot();
  });

  it("Insert at document start", () => {
    expect(
      insertContentAtPosition(getEditor(), 0, "Start of document"),
    ).toMatchSnapshot();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert at document end", () => {
    const editor = getEditor();
    const docSize = editor.prosemirrorState.doc.content.size;

    expect(
      insertContentAtPosition(editor, docSize, "End of document"),
    ).toMatchSnapshot();

    expect(editor.document).toMatchSnapshot();
  });

  it("Insert in middle of text", () => {
    expect(
      insertContentAtPosition(getEditor(), 10, " inserted "),
    ).toMatchSnapshot();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Replace selection with new content", () => {
    expect(
      insertContentAtPosition(
        getEditor(),
        { from: 5, to: 15 },
        "replacement text",
      ),
    ).toMatchSnapshot();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert mixed content (text and styled text)", () => {
    const editor = getEditor();

    expect(
      editor.transact((tr) => {
        const pmSchema = getPmSchema(tr);
        return insertContentAt(tr, 5, [
          pmSchema.text("plain text "),
          pmSchema.text("bold text", [pmSchema.marks.bold.create()]),
          pmSchema.text(" more plain"),
        ]);
      }),
    ).toMatchSnapshot();

    expect(editor.document).toMatchSnapshot();
  });

  it("Insert at position with no selection update", () => {
    const editor = getEditor();

    expect(
      insertContentAtPosition(editor, 5, "no selection update", {
        updateSelection: false,
      }),
    ).toMatchSnapshot();

    // Selection should remain unchanged (the selection might change due to document changes, but not due to updateSelection)
    // We just verify that the operation completed successfully
    expect(editor.document).toMatchSnapshot();
  });

  it("Insert at position with selection update", () => {
    const editor = getEditor();

    expect(
      insertContentAtPosition(editor, 5, "with selection update", {
        updateSelection: true,
      }),
    ).toMatchSnapshot();

    // Selection should be updated to end of inserted content
    expect(editor.prosemirrorState.selection.from).toBeGreaterThan(5);
  });

  it("Insert content that triggers empty paragraph replacement", () => {
    const editor = getEditor();

    // Find an empty paragraph and insert block content at its position
    const emptyParagraphPos = editor.document.findIndex(
      (block) => block.id === "empty-paragraph",
    );

    if (emptyParagraphPos === -1) {
      throw new Error("Empty paragraph not found in test document");
    }

    const pmPos = editor.prosemirrorState.doc
      .resolve(emptyParagraphPos)
      .start();

    expect(
      editor.transact((tr) => {
        const pmSchema = getPmSchema(tr);
        // Create a table node to replace the empty paragraph
        const tableNode = pmSchema.nodes.table.createChecked({}, [
          pmSchema.nodes.tableRow.createChecked({}, [
            pmSchema.nodes.tableCell.createChecked({}, [
              pmSchema.nodes.tableParagraph.createChecked({}, [
                pmSchema.text("Cell content"),
              ]),
            ]),
          ]),
        ]);
        return insertContentAt(tr, pmPos, [tableNode]);
      }),
    ).toMatchSnapshot();

    expect(editor.document).toMatchSnapshot();
  });

  it("Insert content with complex styling", () => {
    expect(
      insertContentAtPosition(getEditor(), 5, [
        { type: "text", text: "Bold and ", styles: { bold: true } },
        { type: "text", text: "italic text", styles: { italic: true } },
        { type: "text", text: " with ", styles: {} },
        { type: "text", text: "underline", styles: { underline: true } },
      ]),
    ).toMatchSnapshot();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert at very specific positions", () => {
    const editor = getEditor();

    // Insert at various specific positions
    expect(insertContentAtPosition(editor, 1, "pos1")).toMatchSnapshot();

    expect(insertContentAtPosition(editor, 50, "pos50")).toMatchSnapshot();

    expect(insertContentAtPosition(editor, 100, "pos100")).toMatchSnapshot();

    expect(editor.document).toMatchSnapshot();
  });
});

describe("Test insertContentAt with Location types", () => {
  it("Insert content using BlockId location", () => {
    expect(
      insertContentAtLocation(
        getEditor(),
        "paragraph-0",
        "inserted at block start",
      ),
    ).toMatchSnapshot();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert content using BlockIdentifier object location", () => {
    expect(
      insertContentAtLocation(
        getEditor(),
        { id: "paragraph-1" },
        "inserted at block start",
      ),
    ).toMatchSnapshot();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert content using Point location at start of block", () => {
    expect(
      insertContentAtLocation(
        getEditor(),
        { id: "paragraph-0", offset: 0 },
        "inserted at start",
      ),
    ).toMatchSnapshot();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert content using Point location in middle of block", () => {
    expect(
      insertContentAtLocation(
        getEditor(),
        { id: "paragraph-0", offset: 5 },
        "inserted in middle",
      ),
    ).toMatchSnapshot();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert content using Point location at end of block", () => {
    expect(
      insertContentAtLocation(
        getEditor(),
        { id: "paragraph-0", offset: -1 },
        "inserted at end",
      ),
    ).toMatchSnapshot();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert content using Range location", () => {
    expect(
      insertContentAtLocation(
        getEditor(),
        {
          anchor: { id: "paragraph-0", offset: 5 },
          head: { id: "paragraph-0", offset: 10 },
        },
        "replaced range",
      ),
    ).toMatchSnapshot();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert content using Range location across blocks", () => {
    expect(
      insertContentAtLocation(
        getEditor(),
        {
          anchor: { id: "paragraph-0", offset: 5 },
          head: { id: "paragraph-1", offset: 5 },
        },
        "replaced across blocks",
      ),
    ).toMatchSnapshot();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert styled content using Point location", () => {
    expect(
      insertContentAtLocation(getEditor(), { id: "paragraph-0", offset: 5 }, [
        { type: "text", text: "bold text", styles: { bold: true } },
        { type: "text", text: " and ", styles: {} },
        { type: "text", text: "italic text", styles: { italic: true } },
      ]),
    ).toMatchSnapshot();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert block content using Point location", () => {
    const editor = getEditor();

    expect(
      editor.transact((tr) => {
        const pmSchema = getPmSchema(tr);
        const range = resolveLocationToPM(tr.doc, {
          id: "paragraph-0",
          offset: 5,
        });
        const paragraphNode = pmSchema.nodes.paragraph.createChecked({}, [
          pmSchema.text("New paragraph"),
        ]);
        return insertContentAt(tr, { from: range.anchor, to: range.head }, [
          paragraphNode,
        ]);
      }),
    ).toMatchSnapshot();

    expect(editor.document).toMatchSnapshot();
  });

  it("Insert content using Point location with updateSelection false", () => {
    expect(
      insertContentAtLocation(
        getEditor(),
        { id: "paragraph-0", offset: 5 },
        "no selection update",
        { updateSelection: false },
      ),
    ).toMatchSnapshot();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert content using Point location with updateSelection true", () => {
    expect(
      insertContentAtLocation(
        getEditor(),
        { id: "paragraph-0", offset: 5 },
        "with selection update",
        { updateSelection: true },
      ),
    ).toMatchSnapshot();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert content using Point location in nested block", () => {
    expect(
      insertContentAtLocation(
        getEditor(),
        { id: "nested-paragraph-0", offset: 5 },
        "inserted in nested block",
      ),
    ).toMatchSnapshot();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert content using Point location in double nested block", () => {
    expect(
      insertContentAtLocation(
        getEditor(),
        { id: "double-nested-paragraph-0", offset: 5 },
        "inserted in double nested block",
      ),
    ).toMatchSnapshot();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert content using Range location in same block", () => {
    expect(
      insertContentAtLocation(
        getEditor(),
        {
          anchor: { id: "paragraph-0", offset: 2 },
          head: { id: "paragraph-0", offset: 8 },
        },
        "replaced in same block",
      ),
    ).toMatchSnapshot();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert content using Range location spanning multiple blocks", () => {
    expect(
      insertContentAtLocation(
        getEditor(),
        {
          anchor: { id: "paragraph-0", offset: 5 },
          head: { id: "paragraph-2", offset: 5 },
        },
        "replaced across multiple blocks",
      ),
    ).toMatchSnapshot();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert content using BlockId location with complex styling", () => {
    expect(
      insertContentAtLocation(getEditor(), "paragraph-with-styled-content", [
        { type: "text", text: "Additional ", styles: {} },
        { type: "text", text: "styled ", styles: { bold: true } },
        { type: "text", text: "content", styles: { italic: true } },
      ]),
    ).toMatchSnapshot();

    expect(getEditor().document).toMatchSnapshot();
  });

  it.only("Insert content using Point location at very specific offset", () => {
    expect(
      insertContentAtLocation(
        getEditor(),
        { id: "paragraph-0", offset: 0 },
        "pos3",
      ),
    ).toMatchInlineSnapshot(`true`);

    expect(
      insertContentAtLocation(
        getEditor(),
        { id: "paragraph-0", offset: 7 },
        "pos7",
      ),
    ).toMatchInlineSnapshot(`true`);

    expect(getEditor().document).toMatchSnapshot();
  });
});
