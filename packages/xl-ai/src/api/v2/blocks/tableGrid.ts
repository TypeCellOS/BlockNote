import type {
  LensInlineContent,
  LensTableCell,
  LensTableContent,
} from "./types.js";

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
  return { type: "tableCell", props: { ...CELL_PROPS }, content: [] };
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
 * of each of its cells. `undefined` if the spans do not fit: two cells cover
 * one position, a cell goes below the last row, or a row has a position
 * without a cell before a position with a cell.
 */
function cellColumns(
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
      if (r + rowspan > rows.length) {
        return undefined;
      }
      for (let dr = 0; dr < rowspan; dr++) {
        for (let dc = 0; dc < colspan; dc++) {
          if (taken[r + dr].has(column + dc)) {
            return undefined;
          }
          taken[r + dr].add(column + dc);
        }
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

/** The width of each row on the grid, or `undefined` if the spans do not fit (see {@link cellColumns}). */
export function gridWidths(
  rows: readonly LensTableCell[][],
): number[] | undefined {
  return cellColumns(rows)?.widths;
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
  const grid = cellColumns(rows);
  if (grid === undefined) {
    return {
      ...table,
      rows: rows.map((cells) => ({ cells: cells.map(single) })),
    };
  }
  const width = Math.max(0, ...grid.widths);
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
