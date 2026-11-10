import type {
  LensInlineContent,
  LensTableCell,
  LensTableContent,
} from "../../model.js";

/**
 * The grid of a table: the cells of each row, with their spans, cover
 * positions of the grid. A merged cell covers more than one position.
 */

/** The props of a cell without a style, as the document stores them. */
const CELL_PROPS = {
  colspan: 1,
  rowspan: 1,
  backgroundColor: "default",
  textColor: "default",
  textAlignment: "left",
};

/** The rows of the table, with each cell in the `tableCell` form. */
export function cellRows(table: LensTableContent): LensTableCell[][] {
  return table.rows.map((row) => row.cells.map(asCell));
}

function asCell(cell: LensInlineContent[] | LensTableCell): LensTableCell {
  return Array.isArray(cell)
    ? { type: "tableCell", props: { ...CELL_PROPS }, content: cell }
    : cell;
}

/** A cell without text and without a style. */
export function emptyCell(): LensTableCell {
  return asCell([]);
}

function spanOf(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1
    ? value
    : 1;
}

/** Returns true if a cell of the table covers more than one position. */
export function hasMergedCells(table: LensTableContent): boolean {
  return cellRows(table).some((cells) =>
    cells.some(
      (cell) =>
        spanOf(cell.props.colspan) > 1 || spanOf(cell.props.rowspan) > 1,
    ),
  );
}

/**
 * The positions of the grid that each cell covers: for each row, the column
 * of each of its cells, and the width of each row. `undefined` if the spans
 * do not fit: two cells cover one position, a cell goes below the last row,
 * or a row has a position without a cell before a position with a cell.
 *
 * Method: as the algorithm for forming a table of the HTML standard: each cell
 * takes the first free position of its row, and covers the positions of its
 * spans.
 */
export function gridOf(
  rows: readonly LensTableCell[][],
): { columns: number[][]; widths: number[] } | undefined {
  const taken = rows.map(() => new Set<number>());
  const columns: number[][] = [];
  for (let r = 0; r < rows.length; r++) {
    let column = 0;
    const own: number[] = [];
    for (const cell of rows[r]) {
      while (taken[r].has(column)) {
        column++;
      }
      own.push(column);
      const colspan = spanOf(cell.props.colspan);
      const rowspan = spanOf(cell.props.rowspan);
      const rowsBelow = taken.slice(r, r + rowspan);
      if (
        rowsBelow.length < rowspan ||
        !coverPositions(rowsBelow, column, colspan)
      ) {
        return undefined;
      }
      column += colspan;
    }
    columns.push(own);
  }
  const widths = taken.map((positions) => positions.size);
  const hasGap = taken.some((positions, r) =>
    Array.from({ length: widths[r] }, (_, c) => c).some(
      (c) => !positions.has(c),
    ),
  );
  return hasGap ? undefined : { columns, widths };
}

/**
 * Marks the positions from `column` to `column + colspan - 1` as taken in
 * each of `rows` (the rows that a cell covers). Returns false if a position
 * is taken already: two cells cover it.
 */
function coverPositions(
  rows: readonly Set<number>[],
  column: number,
  colspan: number,
): boolean {
  for (const taken of rows) {
    for (let c = column; c < column + colspan; c++) {
      if (taken.has(c)) {
        return false;
      }
      taken.add(c);
    }
  }
  return true;
}

/**
 * The table without merged cells: each cell covers one position, and each
 * position that a merged cell covered gets an empty cell. A format without
 * merged cells (markdown, plain text) shows a table in this form. If the
 * spans do not fit, each cell gets the span 1.
 */
export function withoutMergedCells(table: LensTableContent): LensTableContent {
  const rows = cellRows(table);
  const single = (cell: LensTableCell): LensTableCell => ({
    ...cell,
    props: { ...cell.props, colspan: 1, rowspan: 1 },
  });
  const grid = gridOf(rows);
  if (grid === undefined) {
    return {
      ...table,
      rows: rows.map((cells) => ({ cells: cells.map(single) })),
    };
  }
  const width = grid.widths.reduce((max, w) => Math.max(max, w), 0);
  const expanded = rows.map(() =>
    Array.from({ length: width }, (): LensTableCell | undefined => undefined),
  );
  rows.forEach((cells, r) =>
    cells.forEach((cell, k) => {
      expanded[r][grid.columns[r][k]] = single(cell);
    }),
  );
  return {
    ...table,
    rows: expanded.map((cells) => ({
      cells: cells.map((cell) => cell ?? emptyCell()),
    })),
  };
}
