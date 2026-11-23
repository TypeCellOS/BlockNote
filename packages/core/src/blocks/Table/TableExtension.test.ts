import { TextSelection } from "prosemirror-state";
import { CellSelection } from "prosemirror-tables";
import { describe, expect } from "vite-plus/test";

import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import {
  installHeadlessPlugins,
  pressHeadlessKey,
} from "../../extensions/testHeadlessEditor.js";
import type { PartialBlock } from "../defaultBlocks.js";

function pressEnter(editor: BlockNoteEditor) {
  expect(pressHeadlessKey(editor, { key: "Enter" })).toBe(true);
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
  const it = globalThis.it.extend<{ editor: BlockNoteEditor }>({
    editor: async ({ setupEditor }, use) => {
      const { editor } = await setupEditor({ initialContent: testDocument });
      installHeadlessPlugins(editor);
      await use(editor);
    },
  });

  function posInCell(editor: BlockNoteEditor, cellText: string): number {
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

  function setCursorInCell(
    editor: BlockNoteEditor,
    cellText: string,
    offset = 1,
  ) {
    const pos = posInCell(editor, cellText);
    editor.transact((tr) =>
      tr.setSelection(TextSelection.create(tr.doc, pos + offset)),
    );
  }

  it("moves the selection to the cell below", ({ editor }) => {
    setCursorInCell(editor, "Cell 5");

    pressEnter(editor);

    const parentText =
      editor.prosemirrorView.state.selection.$head.parent.textContent;
    expect(parentText).toBe("Cell 8");
  });

  it("does not crash and is a no-op on the last row", ({ editor }) => {
    setCursorInCell(editor, "Cell 8");

    const before = editor.document;
    expect(() => pressEnter(editor)).not.toThrow();
    expect(editor.document).toStrictEqual(before);
  });

  it("does not crash with a (non-empty) text selection in the last row", ({
    editor,
  }) => {
    const start = posInCell(editor, "Cell 8");
    editor.transact((tr) =>
      tr.setSelection(TextSelection.create(tr.doc, start, start + 4)),
    );

    const before = editor.document;
    expect(() => pressEnter(editor)).not.toThrow();
    expect(editor.document).toStrictEqual(before);
  });

  it("does not crash with a multi-cell selection", ({ editor }) => {
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
