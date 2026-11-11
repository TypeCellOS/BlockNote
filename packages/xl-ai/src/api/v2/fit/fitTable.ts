import {
  isTableContent,
  type LensBlock,
  type LensTableContent,
} from "../model.js";
import {
  cellRows,
  deepEqual,
  emptyCell,
  flattenBlocks,
  gridOf,
  hasMergedCells,
  withoutMergedCells,
} from "../util/blocks/index.js";

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
  return mapTables(blocks, fitTable);
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

/**
 * Returns the result of a write with each table that the write changed fit
 * to the rules of a table (see {@link fitTable}). A table that is equal to
 * the table with its ID in `current` stays as it is. The document can hold
 * such a table (for example a table with a short row from a markdown
 * import), and the table plugin of the editor fits only the tables that a
 * transaction changes. Thus, a write does not change a table that the text
 * did not change.
 *
 * @internal
 */
export function fitChangedTables(
  blocks: readonly LensBlock[],
  current: readonly LensBlock[],
): LensBlock[] {
  const currentTables = new Map(
    flattenBlocks(current).flatMap(({ block }) =>
      isTableContent(block.content) ? [[block.id, block.content] as const] : [],
    ),
  );
  return mapTables(blocks, (table, id) =>
    deepEqual(table, currentTables.get(id)) ? table : fitTable(table),
  );
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
 *
 * Method: our own design, for the rules of the table plugin
 * (prosemirror-tables), on the grid of `gridOf`.
 *
 * @internal
 */
export function fitTable(table: LensTableContent): LensTableContent {
  const widths = gridOf(cellRows(table))?.widths;
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

function mapTables(
  blocks: readonly LensBlock[],
  fit: (table: LensTableContent, id: string) => LensTableContent,
): LensBlock[] {
  function map(block: LensBlock): LensBlock {
    return {
      ...block,
      content: isTableContent(block.content)
        ? fit(block.content, block.id)
        : block.content,
      children: block.children.map(map),
    };
  }
  return blocks.map(map);
}
