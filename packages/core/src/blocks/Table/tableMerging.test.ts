// @vitest-environment node
import { CellSelection, TableMap } from "prosemirror-tables";
import { afterEach, expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { TableHandlesExtension } from "../../extensions/TableHandles/TableHandles.js";
import type {
  DefaultInlineContentSchema,
  DefaultStyleSchema,
} from "../defaultBlocks.js";
import type { PartialTableContent } from "../../schema/blocks/types.js";

type TableContentInput = PartialTableContent<
  DefaultInlineContentSchema,
  DefaultStyleSchema
>;

const editors: BlockNoteEditor[] = [];

afterEach(() => {
  for (const editor of editors.splice(0)) {
    editor._tiptapEditor.destroy();
  }
});

function createEditor(content: TableContentInput) {
  const editor = BlockNoteEditor.create({
    initialContent: [{ type: "table", content }],
  });
  editors.push(editor);
  return editor;
}

function mergeAll(editor: BlockNoteEditor) {
  const positions: number[] = [];
  editor.prosemirrorState.doc.descendants((node, pos) => {
    if (
      node.type.spec.tableRole === "cell" ||
      node.type.spec.tableRole === "header_cell"
    ) {
      positions.push(pos);
    }
  });
  editor.transact((tr) =>
    tr.setSelection(
      CellSelection.create(tr.doc, positions[0], positions.at(-1)),
    ),
  );
  expect(editor.getExtension(TableHandlesExtension)!.mergeCells()).toBe(true);
}

function tableContent(editor: BlockNoteEditor) {
  const table = editor.document[0];
  if (table.type !== "table") {
    throw new Error("Expected a table");
  }
  return table.content;
}

function expectValidGrid(
  editor: BlockNoteEditor,
  width: number,
  height: number,
) {
  editor.prosemirrorState.doc.check();
  editor.prosemirrorState.doc.descendants((node) => {
    if (node.type.spec.tableRole === "table") {
      const map = TableMap.get(node);
      expect(map.width).toBe(width);
      expect(map.height).toBe(height);
      expect(map.problems).toBeNull();
    }
  });
}

const rectangularTable: TableContentInput = {
  type: "tableContent",
  columnWidths: [100, 150, 200],
  rows: [{ cells: ["A", "B", "C"] }, { cells: ["D", "E", "F"] }],
};

it.each([
  { name: "body cells", headers: {} },
  { name: "a header row", headers: { headerRows: 1 } },
  { name: "a header column", headers: { headerCols: 1 } },
])(
  "merges every cell with $name without adding a column (#1993)",
  ({ headers }) => {
    const editor = createEditor({ ...rectangularTable, ...headers });
    mergeAll(editor);

    const content = tableContent(editor);
    expect(content.rows.map((row) => row.cells.length)).toEqual([1, 0]);
    expect(content.rows[0].cells[0]).toMatchObject({
      props: { colspan: 3, rowspan: 2 },
      content: [{ type: "text", text: "A\nB\nC\nD\nE\nF", styles: {} }],
    });
    expect(content.columnWidths).toHaveLength(3);
    expectValidGrid(editor, 3, 2);
  },
);

it("keeps multiple rows fully covered by a rowspan empty", () => {
  const editor = createEditor({
    type: "tableContent",
    rows: [{ cells: ["A", "B"] }, { cells: ["C", "D"] }, { cells: ["E", "F"] }],
  });
  mergeAll(editor);
  expect(tableContent(editor).rows.map((row) => row.cells.length)).toEqual([
    1, 0, 0,
  ]);
  expectValidGrid(editor, 2, 3);
});

it("merges a table containing existing rowspans and colspans", () => {
  const editor = createEditor({
    type: "tableContent",
    columnWidths: [100, 150, 200],
    rows: [
      {
        cells: [
          { type: "tableCell", content: "A", props: { rowspan: 2 } },
          { type: "tableCell", content: "B", props: { colspan: 2 } },
        ],
      },
      { cells: ["C", "D"] },
    ],
  });
  mergeAll(editor);
  expect(tableContent(editor).rows.map((row) => row.cells.length)).toEqual([
    1, 0,
  ]);
  expectValidGrid(editor, 3, 2);
});

it("preserves covered rows when saving and reloading BlockNote JSON", () => {
  const editor = createEditor(rectangularTable);
  mergeAll(editor);
  const content = tableContent(editor);
  expect(content.rows[1].cells).toEqual([]);

  // The JSON representation deliberately stores covered rows with no cells.
  // Reload through the public API, not just ProseMirror's nodeFromJSON.
  const saved = structuredClone(editor.document);
  editor.replaceBlocks(editor.document, saved);
  expect(editor.document).toEqual(saved);
  const reloaded = createEditor(content);
  expect(tableContent(reloaded)).toEqual(content);
  expectValidGrid(editor, 3, 2);
  expectValidGrid(reloaded, 3, 2);
});

it("splits a merged table back into the original grid without extra columns", () => {
  const editor = createEditor(rectangularTable);
  mergeAll(editor);
  expect(tableContent(editor).rows[1].cells).toEqual([]);
  expect(editor.getExtension(TableHandlesExtension)!.splitCell()).toBe(true);
  expect(tableContent(editor).rows.map((row) => row.cells.length)).toEqual([
    3, 3,
  ]);
  expect(tableContent(editor).columnWidths).toHaveLength(3);
  expectValidGrid(editor, 3, 2);
});
