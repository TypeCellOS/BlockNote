import { TextSelection } from "prosemirror-state";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { getWholeDocTextSelection } from "../../api/blockManipulation/selections/selection.js";
import { getBlockInfo } from "../../api/getBlockInfoFromPos.js";
import { getNodeById } from "../../api/nodeUtil.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import type { PartialBlock } from "../defaultBlocks.js";

/**
 * @vitest-environment jsdom
 */

// A document that contains a table must still allow selecting that table
// alongside neighbouring blocks, and Mod-a must select the whole document
// (not get clamped into a cell).

const tableAndParagraphs: PartialBlock[] = [
  { id: "paragraph-before", type: "paragraph", content: "Before table" },
  {
    id: "table-0",
    type: "table",
    content: {
      type: "tableContent",
      rows: [{ cells: ["Cell 1", "Cell 2"] }, { cells: ["Cell 3", "Cell 4"] }],
    },
  },
  { id: "paragraph-after", type: "paragraph", content: "After table" },
];

function createEditor(initialContent: PartialBlock[] = tableAndParagraphs) {
  const editor = BlockNoteEditor.create({ initialContent });
  editor.mount(document.createElement("div"));
  return editor;
}

function posOfText(
  editor: BlockNoteEditor,
  text: string,
  atEnd = false,
): number {
  let pos = -1;
  editor.prosemirrorView.state.doc.descendants((node, nodePos) => {
    if (pos === -1 && node.isText && node.text === text) {
      pos = atEnd ? nodePos + node.nodeSize : nodePos;
    }
    return true;
  });
  if (pos === -1) {
    throw new Error(`Text "${text}" not found`);
  }
  return pos;
}

function pressSelectAll(editor: BlockNoteEditor) {
  const view = editor.prosemirrorView;
  const event = new KeyboardEvent("keydown", {
    key: "a",
    code: "KeyA",
    ctrlKey: true,
  });
  view.someProp("handleKeyDown", (handler) => handler(view, event));
}

function pressBackspace(editor: BlockNoteEditor) {
  const view = editor.prosemirrorView;
  const event = new KeyboardEvent("keydown", {
    key: "Backspace",
    code: "Backspace",
  });
  view.someProp("handleKeyDown", (handler) => handler(view, event));
}

function selectedBlockTypes(editor: BlockNoteEditor) {
  return editor.getSelection()?.blocks.map((block) => block.type);
}

describe("table + neighbouring block selection", () => {
  let editor: BlockNoteEditor;

  afterEach(() => {
    editor?._tiptapEditor.destroy();
  });

  it("keeps a TextSelection that starts in a paragraph and ends in a table", () => {
    editor = createEditor();

    editor.setSelection("paragraph-before", "table-0");

    expect(selectedBlockTypes(editor)).toEqual(["paragraph", "table"]);
    expect(editor.prosemirrorView.state.selection).toBeInstanceOf(
      TextSelection,
    );
  });

  it("keeps a TextSelection that starts in a table and ends in a paragraph", () => {
    editor = createEditor();

    editor.setSelection("table-0", "paragraph-after");

    expect(selectedBlockTypes(editor)).toEqual(["table", "paragraph"]);
    expect(editor.prosemirrorView.state.selection).toBeInstanceOf(
      TextSelection,
    );
  });

  it("keeps a TextSelection spanning a paragraph, a table, and the next paragraph", () => {
    editor = createEditor();

    editor.setSelection("paragraph-before", "paragraph-after");

    expect(selectedBlockTypes(editor)).toEqual([
      "paragraph",
      "table",
      "paragraph",
    ]);
  });

  // `tableEditing`'s `normalizeSelection` used to treat any TextSelection
  // with `$to.parentOffset === 0` and one endpoint in a cell as an accidental
  // intra-table span, and clamp it back to a single cell. That is exactly the
  // shape of a mouse selection that has just crossed from a table into the
  // following paragraph (or of select-all when the doc starts with a table
  // and ends on an empty block).
  it("does not clamp a TextSelection that leaves a table at parentOffset 0", () => {
    editor = createEditor();

    const from = posOfText(editor, "Cell 1");
    const to = posOfText(editor, "After table");

    editor.transact((tr) =>
      tr.setSelection(TextSelection.create(tr.doc, from, to)),
    );

    expect(selectedBlockTypes(editor)).toEqual(["table", "paragraph"]);
    expect(editor.prosemirrorView.state.selection.from).toBe(from);
    expect(editor.prosemirrorView.state.selection.to).toBe(to);
  });

  it("does not clamp a TextSelection from a leading table to an empty trailing paragraph", () => {
    editor = createEditor([
      {
        id: "table-0",
        type: "table",
        content: {
          type: "tableContent",
          rows: [{ cells: ["Only"] }],
        },
      },
      { id: "empty", type: "paragraph", content: "" },
    ]);

    const from = posOfText(editor, "Only");
    const emptyBlock = getBlockInfo(
      getNodeById("empty", editor.prosemirrorView.state.doc)!,
    );
    if (!emptyBlock.isBlockContainer) {
      throw new Error("empty paragraph is not a block container");
    }
    const to = emptyBlock.blockContent.beforePos + 1;

    editor.transact((tr) =>
      tr.setSelection(TextSelection.create(tr.doc, from, to)),
    );

    expect(selectedBlockTypes(editor)).toEqual(["table", "paragraph"]);
    expect(editor.prosemirrorView.state.selection.from).toBe(from);
    expect(editor.prosemirrorView.state.selection.to).toBe(to);
  });
});

describe("Mod-a with tables", () => {
  let editor: BlockNoteEditor;

  afterEach(() => {
    editor?._tiptapEditor.destroy();
  });

  function expectWholeDocSelected() {
    const { selection, doc } = editor.prosemirrorView.state;
    const wholeDoc = getWholeDocTextSelection(doc);
    expect(selection).toBeInstanceOf(TextSelection);
    expect(selection.from).toBe(wholeDoc.from);
    expect(selection.to).toBe(wholeDoc.to);
  }

  it("selects the table on the first Mod-a and the whole document on the second", () => {
    editor = createEditor();
    editor.setTextCursorPosition("table-0", "start");

    pressSelectAll(editor);

    expect(selectedBlockTypes(editor)).toEqual(["table"]);

    pressSelectAll(editor);

    expectWholeDocSelected();
    expect(selectedBlockTypes(editor)).toEqual([
      "paragraph",
      "table",
      "paragraph",
    ]);
  });

  it("selects the current paragraph, then the whole document including the table", () => {
    editor = createEditor();
    editor.setTextCursorPosition("paragraph-before", "end");

    pressSelectAll(editor);

    const before = getBlockInfo(
      getNodeById("paragraph-before", editor.prosemirrorView.state.doc)!,
    );
    if (!before.isBlockContainer) {
      throw new Error("paragraph-before is not a block container");
    }
    expect(editor.prosemirrorView.state.selection.from).toBe(
      before.blockContent.beforePos + 1,
    );
    expect(editor.prosemirrorView.state.selection.to).toBe(
      before.blockContent.afterPos - 1,
    );

    pressSelectAll(editor);

    expectWholeDocSelected();
    expect(selectedBlockTypes(editor)).toEqual([
      "paragraph",
      "table",
      "paragraph",
    ]);
  });

  it("clears a document that contains a table on Mod-a + Backspace", () => {
    editor = createEditor();
    editor.setTextCursorPosition("paragraph-after", "end");

    pressSelectAll(editor);
    pressSelectAll(editor);
    pressBackspace(editor);

    expect(editor.document).toEqual([
      expect.objectContaining({ type: "paragraph", content: [] }),
    ]);
  });

  it("clears a document that starts with a table on Mod-a + Backspace", () => {
    editor = createEditor([
      {
        id: "table-0",
        type: "table",
        content: {
          type: "tableContent",
          rows: [{ cells: ["Only"] }],
        },
      },
      { id: "paragraph-after", type: "paragraph", content: "After" },
    ]);
    editor.setTextCursorPosition("table-0", "start");

    pressSelectAll(editor);
    pressSelectAll(editor);
    pressBackspace(editor);

    expect(editor.document).toEqual([
      expect.objectContaining({ type: "paragraph", content: [] }),
    ]);
  });
});
