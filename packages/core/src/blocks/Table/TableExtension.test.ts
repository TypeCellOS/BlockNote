import { GapCursor } from "@tiptap/pm/gapcursor";
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
import { TableHandlesExtension } from "../../extensions/TableHandles/TableHandles.js";
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

describe("TableHandlesExtension.getCellSelection", () => {
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

  function getCellSelection() {
    return editor.getExtension(TableHandlesExtension)!.getCellSelection();
  }

  it("returns undefined for a gap cursor left of a leading table without crashing", () => {
    // A table as the first block in the document, matching the crash repro
    // where clicking in the left margin places a gap cursor at doc start.
    editor.replaceBlocks(editor.document, [
      {
        type: "table",
        content: {
          type: "tableContent",
          rows: [{ cells: ["Cell 1", "Cell 2"] }],
        },
      },
    ]);

    editor.transact((tr) => tr.setSelection(new GapCursor(tr.doc.resolve(0))));

    expect(() => getCellSelection()).not.toThrow();
    expect(getCellSelection()).toBeUndefined();
  });

  it("returns undefined for a gap cursor next to a nested block without crashing", () => {
    // A table as the first block, followed by a nested block. Clicking the
    // nested block's left margin places a gap cursor that is not inside a cell.
    editor.replaceBlocks(editor.document, [
      {
        type: "table",
        content: {
          type: "tableContent",
          rows: [{ cells: ["Cell 1", "Cell 2"] }],
        },
      },
      {
        type: "paragraph",
        content: "Parent",
        children: [{ type: "paragraph", content: "Nested" }],
      },
    ]);

    let nestedPos = -1;
    editor.prosemirrorView.state.doc.descendants((node, pos) => {
      if (nestedPos === -1 && node.isText && node.text === "Nested") {
        nestedPos = pos;
      }
      return true;
    });
    editor.transact((tr) =>
      tr.setSelection(new GapCursor(tr.doc.resolve(nestedPos - 1))),
    );

    expect(() => getCellSelection()).not.toThrow();
    expect(getCellSelection()).toBeUndefined();
  });

  it("returns the cell indices for a text selection inside a cell", () => {
    editor.replaceBlocks(editor.document, [
      {
        type: "table",
        content: {
          type: "tableContent",
          rows: [
            { cells: ["Cell 1", "Cell 2"] },
            { cells: ["Cell 3", "Cell 4"] },
          ],
        },
      },
    ]);

    let cellPos = -1;
    editor.prosemirrorView.state.doc.descendants((node, pos) => {
      if (cellPos === -1 && node.isText && node.text === "Cell 4") {
        cellPos = pos;
      }
      return true;
    });
    editor.transact((tr) =>
      tr.setSelection(TextSelection.create(tr.doc, cellPos + 1)),
    );

    expect(getCellSelection()?.from).toEqual({ row: 1, col: 1 });
    expect(getCellSelection()?.to).toEqual({ row: 1, col: 1 });
  });
});
