import { flattenBlocks } from "../blocks/flatten.js";
import {
  cellRows,
  emptyCell,
  gridWidths,
  hasMergedCells,
  withoutMergedCells,
} from "../blocks/tableGrid.js";
import {
  isTableContent,
  type LensBlock,
  type LensTableContent,
} from "../blocks/types.js";

/**
 * A table lost its merged cells. A format without merged cells (markdown,
 * plain text) shows a merged cell as the cell and empty cells, thus a change
 * of the table there gives a table without merged cells (see
 * `mergeTableContent`). Also, the spans of a table can stop to fit after a
 * change (see {@link fitTable}).
 */
export type FitWarning = { type: "merged-cells-removed"; id: string };

/** Returns the blocks with each table fit to the rules of a table (see {@link fitTable}). */
export function fitTables(blocks: readonly LensBlock[]): LensBlock[] {
  function fit(block: LensBlock): LensBlock {
    return {
      ...block,
      content: isTableContent(block.content)
        ? fitTable(block.content)
        : block.content,
      children: block.children.map(fit),
    };
  }
  return blocks.map(fit);
}

/**
 * Returns the table as the editor can hold it: the cells, with their spans,
 * cover each row to the same width, and no two cells cover one position (as
 * the table plugin of the editor requires). A text can give other tables:
 * for example, a client can remove a cell from a row in HTML. Without this
 * fit, the conversion to the document fails, or the table plugin adds cells
 * in a later transaction (for a Y.Doc, between two transactions of one
 * write).
 *
 * - If the spans do not fit on one grid, the table loses its merged cells
 *   (see `withoutMergedCells`).
 * - A short row gets empty cells at its end.
 */
export function fitTable(table: LensTableContent): LensTableContent {
  const widths = gridWidths(cellRows(table));
  if (widths === undefined) {
    return fitTable(withoutMergedCells(table));
  }
  const width = widths.reduce((max, w) => Math.max(max, w), 0);
  if (widths.every((rowWidth) => rowWidth === width)) {
    return table;
  }
  return {
    ...table,
    columnWidths: Array.from(
      { length: width },
      (_, column) => table.columnWidths[column],
    ),
    rows: cellRows(table).map((cells, r) => ({
      cells: [
        ...cells,
        ...Array.from({ length: width - widths[r] }, emptyCell),
      ],
    })),
  };
}

/** The tables that have merged cells in `before` and none in `after` (see {@link FitWarning}). */
export function mergedCellsRemoved(
  before: readonly LensBlock[],
  after: readonly LensBlock[],
): FitWarning[] {
  const withMergedCells = new Set(
    flattenBlocks(before).flatMap(({ block }) =>
      isTableContent(block.content) && hasMergedCells(block.content)
        ? [block.id]
        : [],
    ),
  );
  return flattenBlocks(after).flatMap(({ block }) =>
    withMergedCells.has(block.id) &&
    isTableContent(block.content) &&
    !hasMergedCells(block.content)
      ? [{ type: "merged-cells-removed" as const, id: block.id }]
      : [],
  );
}
