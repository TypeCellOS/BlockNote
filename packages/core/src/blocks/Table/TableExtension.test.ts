import { TextSelection } from "prosemirror-state";
import { CellSelection } from "prosemirror-tables";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vite-plus/test";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import type { PartialBlock } from "../defaultBlocks.js";

/**
 * @vitest-environment jsdom
 */

function pressEnter(editor: BlockNoteEditor) {
  const view = editor.prosemirrorView;
  const event = new KeyboardEvent("keydown", { key: "Enter" });
  view.someProp("handleKeyDown", (f) => f(view, event));
}

const testDocument: PartialBlock[] = [
  {
    id: "table-0",
    type: "table",
    content: {
      type: "tableContent",
      rows: [
        { cells: ["Cell 1", "Cell 2", "Cell 3"] },
        { cells: ["Cell 4", "Cell 5", "Cell 6"] },
        { cells: ["Cell 7", "Cell 8", "Cell 9"] },
      ],
    },
  },
];

describe("Table Enter keyboard shortcut", () => {
  let editor: BlockNoteEditor;
  const div = document.createElement("div");

  beforeAll(() => {
    editor = BlockNoteEditor.create();
    editor.mount(div);
  });

  afterAll(() => {
    editor._tiptapEditor.destroy();
    editor = undefined as any;
  });

  beforeEach(() => {
    editor.replaceBlocks(editor.document, testDocument);
  });

  function posInCell(cellText: string): number {
    const view = editor.prosemirrorView;
    let pos = -1;
    view.state.doc.descendants((node, nodePos) => {
      if (pos === -1 && node.isText && node.text === cellText) {
        pos = nodePos;
      }
      return true;
    });
    if (pos === -1) {
      throw new Error(`Cell with text "${cellText}" not found`);
    }
    return pos;
  }

  function setCursorInCell(cellText: string, offset = 1) {
    const pos = posInCell(cellText);
    editor.transact((tr) =>
      tr.setSelection(TextSelection.create(tr.doc, pos + offset)),
    );
  }

  it("moves the selection to the cell below", () => {
    setCursorInCell("Cell 5");

    pressEnter(editor);

    const parentText =
      editor.prosemirrorView.state.selection.$head.parent.textContent;
    expect(parentText).toBe("Cell 8");
  });

  it("does not crash and is a no-op on the last row", () => {
    setCursorInCell("Cell 8");

    const before = editor.document;
    expect(() => pressEnter(editor)).not.toThrow();
    expect(editor.document).toStrictEqual(before);
  });

  it("does not crash with a (non-empty) text selection in the last row", () => {
    const start = posInCell("Cell 8");
    editor.transact((tr) =>
      tr.setSelection(TextSelection.create(tr.doc, start, start + 4)),
    );

    const before = editor.document;
    expect(() => pressEnter(editor)).not.toThrow();
    expect(editor.document).toStrictEqual(before);
  });

  it("does not crash with a multi-cell selection", () => {
    const view = editor.prosemirrorView;
    const cellPositions: number[] = [];
    view.state.doc.descendants((node, pos) => {
      if (node.type.name === "tableCell" || node.type.name === "tableHeader") {
        cellPositions.push(pos);
      }
      return true;
    });

    editor.transact((tr) =>
      tr.setSelection(
        CellSelection.create(tr.doc, cellPositions[0], cellPositions[1]) as any,
      ),
    );

    const before = editor.document;
    expect(() => pressEnter(editor)).not.toThrow();
    expect(editor.document).toStrictEqual(before);
  });
});
