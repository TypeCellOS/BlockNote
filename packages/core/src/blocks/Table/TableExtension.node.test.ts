import { GapCursor } from "@tiptap/pm/gapcursor";
import type { Node } from "prosemirror-model";
import { TextSelection } from "prosemirror-state";
import { CellSelection, mergeCells, tableEditing } from "prosemirror-tables";
import { describe, expect } from "vite-plus/test";

import { TableHandlesExtension } from "../../extensions/TableHandles/TableHandles.js";
import { mapTableCell } from "../../util/table.js";
import type { PartialBlock } from "../defaultBlocks.js";

function tableWithRows(rows: string[][]): PartialBlock {
  return {
    type: "table",
    content: {
      type: "tableContent",
      rows: rows.map((cells) => ({ cells })),
    },
  };
}

function textPosition(doc: Node, text: string): number {
  let position: number | undefined;
  doc.descendants((node, pos) => {
    if (position === undefined && node.isText && node.text === text) {
      position = pos;
    }
  });
  if (position === undefined) {
    throw new Error(`Missing test text: ${text}`);
  }
  return position;
}

describe("TableHandlesExtension.getCellSelection", () => {
  it("returns undefined for a gap cursor left of a leading table without crashing", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      initialContent: [tableWithRows([["Cell 1", "Cell 2"]])],
    });
    const handles = editor.getExtension(TableHandlesExtension)!;
    editor.transact((tr) => tr.setSelection(new GapCursor(tr.doc.resolve(0))));

    expect(() => handles.getCellSelection()).not.toThrow();
    expect(handles.getCellSelection()).toBeUndefined();
  });

  it("returns undefined for a gap cursor next to a nested block without crashing", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      initialContent: [
        tableWithRows([["Cell 1", "Cell 2"]]),
        {
          type: "paragraph",
          content: "Parent",
          children: [{ type: "paragraph", content: "Nested" }],
        },
      ],
    });
    const handles = editor.getExtension(TableHandlesExtension)!;
    editor.transact((tr) => {
      // A left-margin click can place a gap cursor just before nested text.
      const pos = textPosition(tr.doc, "Nested") - 1;
      tr.setSelection(new GapCursor(tr.doc.resolve(pos)));
    });

    expect(() => handles.getCellSelection()).not.toThrow();
    expect(handles.getCellSelection()).toBeUndefined();
  });

  it("returns the cell indices for a text selection inside a cell", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      initialContent: [
        tableWithRows([
          ["Cell 1", "Cell 2"],
          ["Cell 3", "Cell 4"],
        ]),
      ],
    });
    const handles = editor.getExtension(TableHandlesExtension)!;
    editor.transact((tr) => {
      const pos = textPosition(tr.doc, "Cell 4") + 1;
      tr.setSelection(TextSelection.create(tr.doc, pos));
    });

    expect(handles.getCellSelection()?.from).toEqual({ row: 1, col: 1 });
    expect(handles.getCellSelection()?.to).toEqual({ row: 1, col: 1 });
  });
});

describe("Merging table cells", () => {
  it("merges every cell into one cell without adding a column", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      initialContent: [
        tableWithRows([
          ["Cell 1", "Cell 2", "Cell 3"],
          ["Cell 4", "Cell 5", "Cell 6"],
        ]),
      ],
    });
    // Preserve normalization and selection behavior from the real table plugin.
    editor.registerExtension({
      key: "test-table-editing",
      prosemirrorPlugins: [tableEditing()],
    });
    editor.transact((tr) => {
      const cellPositions: number[] = [];
      tr.doc.descendants((node, pos) => {
        if (node.type.name === "tableCell") {
          cellPositions.push(pos);
        }
      });
      tr.setSelection(
        CellSelection.create(tr.doc, cellPositions[0], cellPositions.at(-1)!),
      );
    });

    expect(editor.exec(mergeCells)).toBe(true);

    const table = editor.document[0];
    if (table.type !== "table") {
      throw new Error("Expected a table block");
    }
    // The second row is fully covered by the merged cell's rowspan.
    expect(table.content.rows.map((row) => row.cells.length)).toEqual([1, 0]);
    expect(mapTableCell(table.content.rows[0].cells[0]).props).toMatchObject({
      colspan: 3,
      rowspan: 2,
    });
    expect(table.content.columnWidths).toHaveLength(3);
  });
});
