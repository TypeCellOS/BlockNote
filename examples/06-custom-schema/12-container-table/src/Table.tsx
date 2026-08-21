import {
  createExtension,
  type Block,
  type BlockNoteEditor,
} from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";

import "./styles.css";

// A table built entirely out of container blocks, without `prosemirror-tables`
// or the special `"table"` content type. A table is a container of rows, a row
// is a container of cells, and a cell is a container of arbitrary blocks:
//
//   table > tableRow > tableCell / tableHeader > (any blocks)
//
// The JSON shape is the same `children` array every other container block
// uses, and every structural operation (add/remove row or column, toggle the
// header row) is a plain `insertBlocks` / `removeBlocks` / `updateBlock` call.

type AnyEditor = BlockNoteEditor<any, any, any>;
type AnyBlock = Block<any, any, any>;

function isCellType(type: string): boolean {
  return type === "tableCell" || type === "tableHeader";
}

// ---------------------------------------------------------------------------
// Cell navigation (Tab / Shift-Tab)
// ---------------------------------------------------------------------------

// Finds the cell / row / table the text cursor is currently inside, by
// walking up the ancestor chain with `editor.getParentBlock`. Returns
// undefined when the cursor isn't in a table.
function getCellContext(
  editor: AnyEditor,
): { cell: AnyBlock; row: AnyBlock; table: AnyBlock } | undefined {
  let current: AnyBlock | undefined = editor.getTextCursorPosition().block;
  while (current && !isCellType(current.type)) {
    current = editor.getParentBlock(current);
  }
  if (!current) {
    return undefined;
  }

  const row = editor.getParentBlock(current);
  if (!row || row.type !== "tableRow") {
    return undefined;
  }
  const table = editor.getParentBlock(row);
  if (!table || table.type !== "table") {
    return undefined;
  }

  return { cell: current, row, table };
}

// Places the cursor inside a cell. Descends through nested tables so the
// cursor always lands on a block that can actually hold it.
function placeCursorInCell(
  editor: AnyEditor,
  cell: AnyBlock,
  placement: "start" | "end",
) {
  let target = cell;
  while (
    target.children.length > 0 &&
    (target.type === "table" ||
      target.type === "tableRow" ||
      isCellType(target.type))
  ) {
    target =
      placement === "start"
        ? target.children[0]
        : target.children[target.children.length - 1];
  }
  editor.setTextCursorPosition(target, placement);
}

function createRow(
  numColumns: number,
  cellType: "tableCell" | "tableHeader" = "tableCell",
) {
  return {
    type: "tableRow" as const,
    children: Array.from({ length: numColumns }, () => ({ type: cellType })),
  };
}

// Moves the cursor to the next/previous cell, wrapping across rows. Tab past
// the last cell grows the table by a row, like in a spreadsheet, with a
// single `insertBlocks` call.
function moveToAdjacentCell(editor: AnyEditor, direction: 1 | -1): boolean {
  const context = getCellContext(editor);
  if (!context) {
    // Not in a table: let BlockNote's default Tab (indent) behavior run.
    return false;
  }
  const { cell, row, table } = context;

  const rows = table.children;
  const rowIndex = rows.findIndex((r) => r.id === row.id);
  const cellIndex = row.children.findIndex((c) => c.id === cell.id);

  let targetRowIndex = rowIndex;
  let targetCellIndex = cellIndex + direction;
  if (targetCellIndex >= row.children.length) {
    targetRowIndex += 1;
    targetCellIndex = 0;
  } else if (targetCellIndex < 0) {
    targetRowIndex -= 1;
    targetCellIndex =
      targetRowIndex >= 0 ? rows[targetRowIndex].children.length - 1 : 0;
  }

  // Shift-Tab at the very first cell: stay put (but consume the key so the
  // cell's content isn't un-indented out of the table).
  if (targetRowIndex < 0) {
    return true;
  }

  // Tab at the very last cell: append a new row and move into it.
  if (targetRowIndex >= rows.length) {
    editor.insertBlocks(
      [createRow(row.children.length)],
      rows[rows.length - 1],
      "after",
    );
    const updatedTable = editor.getBlock(table.id);
    const newRow = updatedTable?.children[updatedTable.children.length - 1];
    if (newRow) {
      placeCursorInCell(editor, newRow.children[0], "start");
    }
    return true;
  }

  placeCursorInCell(
    editor,
    rows[targetRowIndex].children[targetCellIndex],
    direction === 1 ? "start" : "end",
  );
  return true;
}

// Registered on the `table` block spec, so the shortcuts are only added when
// the block is in the schema. Block-spec extensions run before BlockNote's
// default keyboard handlers, so Tab reaches us before the default indent.
const TableKeyboardExtension = createExtension({
  key: "containerTableKeyboard",
  keyboardShortcuts: {
    Tab: ({ editor }) => moveToAdjacentCell(editor, 1),
    "Shift-Tab": ({ editor }) => moveToAdjacentCell(editor, -1),
  },
});

// ---------------------------------------------------------------------------
// Structural operations, using only the public block manipulation API
// ---------------------------------------------------------------------------

function getTable(editor: AnyEditor, tableId: string): AnyBlock | undefined {
  const table = editor.getBlock(tableId);
  return table?.type === "table" ? table : undefined;
}

export function addRow(editor: AnyEditor, tableId: string) {
  const table = getTable(editor, tableId);
  if (!table) {
    return;
  }
  const lastRow = table.children[table.children.length - 1];
  editor.insertBlocks([createRow(lastRow.children.length)], lastRow, "after");
}

export function removeRow(editor: AnyEditor, tableId: string) {
  const table = getTable(editor, tableId);
  if (!table || table.children.length <= 1) {
    return;
  }
  editor.removeBlocks([table.children[table.children.length - 1]]);
}

export function addColumn(editor: AnyEditor, tableId: string) {
  const table = getTable(editor, tableId);
  if (!table) {
    return;
  }
  editor.transact(() => {
    for (const row of table.children) {
      const lastCell = row.children[row.children.length - 1];
      // Match the row's cell kind, so a header row grows a header cell.
      editor.insertBlocks([{ type: lastCell.type }], lastCell, "after");
    }
  });
}

export function removeColumn(editor: AnyEditor, tableId: string) {
  const table = getTable(editor, tableId);
  if (!table || table.children.some((row) => row.children.length <= 1)) {
    return;
  }
  editor.transact(() => {
    for (const row of table.children) {
      editor.removeBlocks([row.children[row.children.length - 1]]);
    }
  });
}

// Flips the first row between header cells and regular cells. Because header
// cells are a distinct block type (not table metadata), this is just
// `updateBlock` with a new type. Children are carried over automatically.
export function toggleHeaderRow(editor: AnyEditor, tableId: string) {
  const table = getTable(editor, tableId);
  if (!table) {
    return;
  }
  const firstRow = table.children[0];
  const allHeaders = firstRow.children.every((c) => c.type === "tableHeader");
  const type = allHeaders ? "tableCell" : "tableHeader";
  editor.transact(() => {
    for (const cell of firstRow.children) {
      editor.updateBlock(cell, { type });
    }
  });
}

// ---------------------------------------------------------------------------
// The four block specs
// ---------------------------------------------------------------------------

// The table itself: a container that only accepts rows. Inserting one with
// no explicit children seeds it from `children.default`: a header row plus
// two body rows, three columns wide.
export const createTable = createReactBlockSpec(
  {
    type: "table",
    propSchema: {},
    content: "none",
    children: {
      allow: ["tableRow"],
      default: [
        createRow(3, "tableHeader"),
        createRow(3, "tableCell"),
        createRow(3, "tableCell"),
      ],
    },
  },
  {
    render: (props) => {
      // `props.block` is captured at render time; the control handlers
      // re-fetch the table by id so they always operate on fresh children.
      const { editor } = props;
      const tableId = props.block.id;

      // Keep focus (and the text selection) in the editor when clicking the
      // controls.
      const keepFocus = (event: React.MouseEvent) => event.preventDefault();

      return (
        <div className={"container-table"}>
          <div className={"container-table-rows"} ref={props.contentRef} />
          <div
            className={"container-table-controls"}
            contentEditable={false}
            onMouseDown={keepFocus}
          >
            <button onClick={() => addRow(editor, tableId)}>+ Row</button>
            <button onClick={() => removeRow(editor, tableId)}>− Row</button>
            <button onClick={() => addColumn(editor, tableId)}>+ Col</button>
            <button onClick={() => removeColumn(editor, tableId)}>− Col</button>
            <button onClick={() => toggleHeaderRow(editor, tableId)}>
              Toggle header
            </button>
          </div>
        </div>
      );
    },
    // Recognizes pasted foreign HTML tables.
    parse: (el) => (el.tagName === "TABLE" ? {} : undefined),
  },
  [TableKeyboardExtension],
);

// A row: only lives inside a table (`placement: "containerOnly"`), only
// holds cells.
export const createTableRow = createReactBlockSpec(
  {
    type: "tableRow",
    propSchema: {},
    content: "none",
    children: { allow: ["tableCell", "tableHeader"] },
    placement: "containerOnly",
  },
  {
    // No drag handle of its own; the side menu handle falls through to the
    // table.
    meta: { draggable: false },
    render: (props) => (
      <div className={"container-table-row"} ref={props.contentRef} />
    ),
    parse: (el) => (el.tagName === "TR" ? {} : undefined),
  },
);

// A cell: holds any blocks, and is `boundary: "sealed"`, so the caret and
// content never implicitly cross its edge (Backspace at the start of a cell
// does nothing, Delete at its end doesn't pull the next block in, arrow keys
// from outside treat the table as a unit). Enter inside a cell just adds
// another block to the cell.
export const createTableCell = createReactBlockSpec(
  {
    type: "tableCell",
    propSchema: {},
    content: "none",
    children: { allow: "any", boundary: "sealed" },
    placement: "containerOnly",
  },
  {
    meta: { draggable: false },
    render: (props) => (
      <div className={"container-table-cell"} ref={props.contentRef} />
    ),
    parse: (el) => (el.tagName === "TD" ? {} : undefined),
  },
);

// A header cell: identical to a regular cell, but a distinct block type.
// The structure itself encodes which cells are headers, instead of
// `headerRows` metadata on the table.
export const createTableHeader = createReactBlockSpec(
  {
    type: "tableHeader",
    propSchema: {},
    content: "none",
    children: { allow: "any", boundary: "sealed" },
    placement: "containerOnly",
  },
  {
    meta: { draggable: false },
    render: (props) => (
      <div
        className={"container-table-cell container-table-header"}
        ref={props.contentRef}
      />
    ),
    parse: (el) => (el.tagName === "TH" ? {} : undefined),
  },
);
