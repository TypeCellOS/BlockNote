import { DefaultBlockSchema } from "../../../blocks/defaultBlocks.js";
import {
  BlockFromConfigNoChildren,
  PartialTableContent,
  TableCell,
  TableContent,
} from "../../../schema/blocks/types.js";
import {
  isPartialLinkInlineContent,
  isStyledTextInlineContent,
} from "../../../schema/index.js";
import {
  getColspan,
  getRowspan,
  isPartialTableCell,
  mapTableCell,
} from "../../../util/table.js";

/**
 * Here be dragons.
 *
 * Tables are complex because of rowspan and colspan behavior.
 * The majority of this file is concerned with translating between "relative" and "absolute" indices.
 *
 * The following diagram may help explain the relationship between the different indices:
 *
 *  One-based indexing of rows and columns in a table:
 *  | 1-1 | 1-2 | 1-3 |
 *  | 2-1 | 2-2 | 2-3 |
 *  | 3-1 | 3-2 | 3-3 |
 *
 *  A complicated table with colspans and rowspans:
 *  | 1-1 | 1-2 | 1-2 |
 *  | 2-1 | 2-1 | 2-2 |
 *  | 2-1 | 2-1 | 3-1 |
 *
 * You can see here that we have:
 *  - two cells that contain the value "1-2", because it has a colspan of 2.
 *  - four cells that contain the value "2-1", because it has a rowspan of 2 and a colspan of 2.
 *
 * This would be represented in block note json (roughly) as:
 *  [
 *      {
 *       "cells": [
 *         {
 *           "type": "tableCell",
 *             "content": ["1,1"],
 *             "props": {
 *               "colspan": 1,
 *               "rowspan": 1
 *             },
 *           },
 *           {
 *             "type": "tableCell",
 *             "content": ["1,2"],
 *             "props": {
 *               "colspan": 2,
 *               "rowspan": 1
 *             }
 *           }
 *         ],
 *       },
 *       {
 *         "cells": [
 *           {
 *             "type": "tableCell",
 *             "content": ["2,1"],
 *             "props": {
 *                 "colspan": 2,
 *                 "rowspan": 2
 *               }
 *             },
 *           {
 *             "type": "tableCell",
 *             "content": ["2,2"],
 *             "props": {
 *               "colspan": 1,
 *               "rowspan": 1
 *            }
 *         ],
 *       },
 *       {
 *         "cells": [
 *           {
 *             "type": "tableCell",
 *             "content": ["3,1"],
 *             "props": {
 *               "colspan": 1,
 *               "rowspan": 1,
 *             }
 *           }
 *         ]
 *       }
 *     ]
 *
 * Which maps cleanly to the following HTML:
 *
 * <table>
 *   <tr>
 *     <td>1-1</td>
 *     <td colspan="2">1-2</td>
 *   </tr>
 *   <tr>
 *     <td rowspan="2" colspan="2">2-1</td>
 *     <td>2-2</td>
 *   </tr>
 *   <tr>
 *     <td>3-1</td>
 *   </tr>
 * </table>
 *
 * We have a problem though, from the block json, there is no way to tell that the cell "2-1" is the second cell in the second row.
 * To resolve this, we created the occupancy grid, which is a grid of all the cells in the table, as though they were only 1x1 cells.
 * See {@link OccupancyGrid} for more information.
 *
 */

/**
 * Relative cell indices are relative to the table block's content.
 *
 * This is a sparse representation of the table and is how HTML and BlockNote JSON represent tables.
 *
 * For example, if we have a table with a rowspan of 2, the second row may only have 1 element in a 2x2 table.
 *
 * ```
 * // Visual representation of the table
 *     | 1-1 | 1-2 | // has 2 cells
 *     | 1-1 | 2-2 | // has only 1 cell
 * // Relative cell indices
 *     [{ row: 1, col: 1, rowspan: 2 }, { row: 1, col: 2 }] // has 2 cells
 *     [{ row: 1, col: 2 }] // has only 1 cell
 * ```
 */
export type RelativeCellIndices = {
  row: number;
  col: number;
};

/**
 * Absolute cell indices are relative to the table's layout (it's {@link OccupancyGrid}).
 *
 * It is as though the table is a grid of 1x1 cells, and any colspan or rowspan results in multiple 1x1 cells being occupied.
 *
 * For example, if we have a table with a colspan of 2, it will occupy 2 cells in the layout grid.
 *
 * ```
 * // Visual representation of the table
 *     | 1-1 | 1-1 | // has 2 cells
 *     | 2-1 | 2-2 | // has 2 cell
 * // Absolute cell indices
 *     [{ row: 1, col: 1, colspan: 2 }, { row: 1, col: 2, colspan: 2 }] // has 2 cells
 *     [{ row: 1, col: 1 }, { row: 1, col: 2 }] // has 2 cells
 * ```
 */
export type AbsoluteCellIndices = {
  row: number;
  col: number;
};

/**
 * An occupancy grid is a grid of the occupied cells in the table.
 * It is used to track the occupied cells in the table to know where to place the next cell.
 *
 * Since it allows us to resolve cell indices both {@link RelativeCellIndices} and {@link AbsoluteCellIndices}, it is the core data structure for table operations.
 */
type OccupancyGrid = (RelativeCellIndices & {
  /**
   * The rowspan of the cell.
   */
  rowspan: number;
  /**
   * The colspan of the cell.
   */
  colspan: number;
  /**
   * The cell.
   */
  cell: TableCell<any, any>;
})[][];

/**
 * This will return the {@link OccupancyGrid} of the table.
 * By laying out the table as though it were a grid of 1x1 cells, we can easily track where the cells are located (both relatively and absolutely).
 *
 * @returns an {@link OccupancyGrid}
 */
export function getTableCellOccupancyGrid(
  block: BlockFromConfigNoChildren<DefaultBlockSchema["table"], any, any>,
): OccupancyGrid {
  const { height, width } = getDimensionsOfTable(block);

  /**
   * Create a grid to track occupied cells
   * This is used because rowspans and colspans take up multiple spaces
   * So, we need to track the occupied cells in the grid to know where to place the next cell
   */
  const grid: OccupancyGrid = new Array(height)
    .fill(false)
    .map(() => new Array(width).fill(null));

  // Find the next unoccupied cell in the table, row-major order
  const findNextAvailable = (row: number, col: number) => {
    for (let i = row; i < height; i++) {
      for (let j = col; j < width; j++) {
        if (!grid[i][j]) {
          return { row: i, col: j };
        }
      }
    }

    throw new Error(
      "Unable to create occupancy grid for table, no more available cells",
    );
  };

  // Build up the grid, trying to fill in the cells with the correct relative row and column indices
  for (let row = 0; row < block.content.rows.length; row++) {
    for (let col = 0; col < block.content.rows[row].cells.length; col++) {
      const cell = mapTableCell(block.content.rows[row].cells[col]);
      const rowspan = getRowspan(cell);
      const colspan = getColspan(cell);

      // Rowspan and colspan complicate things, by taking up multiple cells in the grid
      // We need to iterate over the cells that the rowspan and colspan take up
      // and fill in the grid with the correct relative row and column indices
      const { row: startRow, col: startCol } = findNextAvailable(row, col);

      // Fill in the rowspan X colspan cells, starting from the next available cell, with the correct relative row and column indices
      for (let i = startRow; i < startRow + rowspan; i++) {
        for (let j = startCol; j < startCol + colspan; j++) {
          if (grid[i][j]) {
            // The cell is already occupied, the table is malformed
            throw new Error(
              `Unable to create occupancy grid for table, cell at ${i},${j} is already occupied`,
            );
          }

          grid[i][j] = {
            row,
            col,
            rowspan,
            colspan,
            cell,
          };
        }
      }
    }
  }

  // console.log(grid);

  return grid;
}

/**
 * Given an {@link OccupancyGrid}, this will return the {@link TableContent} rows.
 *
 * @note This will remove duplicates from the occupancy grid. And does no bounds checking for validity of the occupancy grid.
 */
export function getTableRowsFromOccupancyGrid(
  occupancyGrid: OccupancyGrid,
): TableContent<any, any>["rows"] {
  // Because a cell can have a rowspan or colspan, it can occupy multiple cells in the occupancy grid
  // So, we need to remove duplicates from the occupancy grid before we can return the table rows
  const seen = new Set<string>();

  return occupancyGrid.map((row) => {
    // Just read out the cells in the occupancy grid, removing duplicates
    return {
      cells: row
        .map((cell) => {
          if (seen.has(cell.row + ":" + cell.col)) {
            return false;
          }
          seen.add(cell.row + ":" + cell.col);
          return cell.cell;
        })
        .filter((cell): cell is TableCell<any, any> => cell !== false),
    };
  });
}

/**
 * This will resolve the relative cell indices within the table block to the absolute cell indices within the table, accounting for colspan and rowspan.
 *
 * @note It will return only the first cell (i.e. top-left) that matches the relative cell indices. To find the other absolute cell indices this cell occupies, you can assume it is the rowspan and colspan number of cells away from the top-left cell.
 *
 * @returns The {@link AbsoluteCellIndices} and the {@link TableCell} at the absolute position.
 */
export function getAbsoluteTableCells(
  /**
   * The relative position of the cell in the table.
   */
  relativeCellIndices: RelativeCellIndices,
  /**
   * The table block containing the cell.
   */
  block: BlockFromConfigNoChildren<DefaultBlockSchema["table"], any, any>,
  /**
   * The occupancy grid of the table.
   */
  occupancyGrid: OccupancyGrid = getTableCellOccupancyGrid(block),
): AbsoluteCellIndices & {
  cell: TableCell<any, any>;
} {
  for (let r = 0; r < occupancyGrid.length; r++) {
    for (let c = 0; c < occupancyGrid[r].length; c++) {
      // console.log(r, c, occupancyGrid);
      const cell = occupancyGrid[r][c];
      if (
        cell.row === relativeCellIndices.row &&
        cell.col === relativeCellIndices.col
      ) {
        return { row: r, col: c, cell: cell.cell };
      }
    }
  }

  throw new Error(
    `Unable to resolve relative table cell indices for table, cell at ${relativeCellIndices.row},${relativeCellIndices.col} is not occupied`,
  );
}

/**
 * This will get the dimensions of the table block.
 *
 * @returns The height and width of the table.
 */
export function getDimensionsOfTable(
  block: BlockFromConfigNoChildren<DefaultBlockSchema["table"], any, any>,
): {
  /**
   * The number of rows in the table.
   */
  height: number;
  /**
   * The number of columns in the table.
   */
  width: number;
} {
  // Due to the way we store the table, the height is always the number of rows
  const height = block.content.rows.length;

  // Calculating the width is a bit more complex, as it is the maximum width of any row
  let width = 0;
  block.content.rows.forEach((row) => {
    // Find the width of the row by summing the colspan of each cell
    let rowWidth = 0;
    row.cells.forEach((cell) => {
      rowWidth += getColspan(cell);
    });

    // Update the width if the row is wider than the current width
    width = Math.max(width, rowWidth);
  });

  return { height, width };
}

/**
 * This will resolve the absolute cell indices within the table block to the relative cell indices within the table, accounting for colspan and rowspan.
 *
 * @returns The {@link RelativeCellIndices} and the {@link TableCell} at the relative position.
 */
export function getRelativeTableCells(
  /**
   * The {@link AbsoluteCellIndices} of the cell in the table.
   */
  absoluteCellIndices: AbsoluteCellIndices,
  /**
   * The table block containing the cell.
   */
  block: BlockFromConfigNoChildren<DefaultBlockSchema["table"], any, any>,
  /**
   * The occupancy grid of the table.
   */
  occupancyGrid: OccupancyGrid = getTableCellOccupancyGrid(block),
):
  | (RelativeCellIndices & {
      cell: TableContent<any, any>["rows"][number]["cells"][number];
    })
  | undefined {
  const occupancyCell =
    occupancyGrid[absoluteCellIndices.row]?.[absoluteCellIndices.col];

  // Double check that the cell can be accessed
  if (!occupancyCell) {
    // The cell is not occupied, so it is invalid
    return undefined;
  }

  return {
    row: occupancyCell.row,
    col: occupancyCell.col,
    cell: occupancyCell.cell,
  };
}

/**
 * This will get all the cells within a relative row of a table block.
 *
 * This method always starts the search for the row at the first column of the table.
 *
 * ```
 * // Visual representation of a table
 * | A | B | C |
 * |   | D | E |
 * | F | G | H |
 * // "A" has a rowspan of 2
 *
 * // getCellsAtRowHandle(0)
 * // returns [
 *  { row: 0, col: 0, cell: "A" },
 *  { row: 0, col: 1, cell: "B" },
 *  { row: 0, col: 2, cell: "C" },
 * ]
 *
 * // getCellsAtColumnHandle(1)
 * // returns [
 *  { row: 1, col: 0, cell: "F" },
 *  { row: 1, col: 1, cell: "G" },
 *  { row: 1, col: 2, cell: "H" },
 * ]
 * ```
 *
 * As you can see, you may not be able to retrieve all nodes given a relative row index, as cells can span multiple rows.
 *
 * @returns All of the cells associated with the relative row of the table. (All cells that have the same relative row index)
 */
export function getCellsAtRowHandle(
  block: BlockFromConfigNoChildren<DefaultBlockSchema["table"], any, any>,
  relativeRowIndex: RelativeCellIndices["row"],
) {
  const occupancyGrid = getTableCellOccupancyGrid(block);

  if (relativeRowIndex < 0 || relativeRowIndex >= occupancyGrid.length) {
    return [];
  }

  // First need to resolve the relative row index to an absolute row index
  let absoluteRow = 0;

  // Jump through the occupied cells ${relativeCellIndices.row} times to find the absolute row position
  for (let i = 0; i < relativeRowIndex; i++) {
    const cell = occupancyGrid[absoluteRow]?.[0];

    if (!cell) {
      return [];
    }

    // Skip the cells that the rowspan takes up
    absoluteRow += cell.rowspan;
  }

  // Then for each column, get the cell at the absolute row index as a relative cell index
  const cells = new Array(occupancyGrid[0].length)
    .fill(false)
    .map((_v, col) => {
      return getRelativeTableCells(
        { row: absoluteRow, col },
        block,
        occupancyGrid,
      );
    })
    .filter(
      (a): a is RelativeCellIndices & { cell: TableCell<any, any> } =>
        a !== undefined,
    );

  // Filter out duplicates based on row and col properties
  return cells.filter((cell, index) => {
    return (
      cells.findIndex((c) => c.row === cell.row && c.col === cell.col) === index
    );
  });
}

/**
 * This will get all the cells within a relative column of a table block.
 *
 * This method always starts the search for the column at the first row of the table.
 *
 * ```
 * // Visual representation of a table
 * |   A   | B |
 * | C | D | E |
 * | F | G | H |
 * // "A" has a colspan of 2
 *
 * // getCellsAtColumnHandle(0)
 * // returns [
 *  { row: 0, col: 0, cell: "A" },
 *  { row: 1, col: 0, cell: "C" },
 *  { row: 2, col: 0, cell: "F" },
 * ]
 *
 * // getCellsAtColumnHandle(1)
 * // returns [
 *  { row: 0, col: 1, cell: "B" },
 *  { row: 1, col: 2, cell: "E" },
 *  { row: 2, col: 2, cell: "F" },
 * ]
 * ```
 *
 * As you can see, you may not be able to retrieve all nodes given a relative column index, as cells can span multiple columns.
 *
 * @returns All of the cells associated with the relative column of the table. (All cells that have the same relative column index)
 */
export function getCellsAtColumnHandle(
  block: BlockFromConfigNoChildren<DefaultBlockSchema["table"], any, any>,
  relativeColumnIndex: RelativeCellIndices["col"],
) {
  const occupancyGrid = getTableCellOccupancyGrid(block);

  if (
    relativeColumnIndex < 0 ||
    relativeColumnIndex >= occupancyGrid[0].length
  ) {
    return [];
  }

  // First need to resolve the relative column index to an absolute column index
  let absoluteCol = 0;

  // Now that we've already resolved the absolute row position, we can jump through the occupied cells ${relativeCellIndices.col} times to find the absolute column position
  for (let i = 0; i < relativeColumnIndex; i++) {
    const cell = occupancyGrid[0]?.[absoluteCol];

    if (!cell) {
      return [];
    }

    // Skip the cells that the colspan takes up
    absoluteCol += cell.colspan;
  }

  // Then for each row, get the cell at the absolute column index as a relative cell index
  const cells = new Array(occupancyGrid.length)
    .fill(false)
    .map((_v, row) => {
      return getRelativeTableCells(
        { row, col: absoluteCol },
        block,
        occupancyGrid,
      );
    })
    .filter(
      (a): a is RelativeCellIndices & { cell: TableCell<any, any> } =>
        a !== undefined,
    );

  // Filter out duplicates based on row and col properties
  return cells.filter((cell, index) => {
    return (
      cells.findIndex((c) => c.row === cell.row && c.col === cell.col) === index
    );
  });
}

/**
 * This moves a column from one index to another.
 *
 * @note This is a destructive operation, it will modify the provided {@link OccupancyGrid} in place.
 */
export function moveColumn(
  block: BlockFromConfigNoChildren<DefaultBlockSchema["table"], any, any>,
  fromColIndex: RelativeCellIndices["col"],
  toColIndex: RelativeCellIndices["col"],
  occupancyGrid: OccupancyGrid = getTableCellOccupancyGrid(block),
): TableContent<any, any>["rows"] {
  // To move cells in a column, we need to layout the whole table
  // and then move the cells accordingly.
  const { col: absoluteSourceCol } = getAbsoluteTableCells(
    {
      row: 0,
      col: fromColIndex,
    },
    block,
    occupancyGrid,
  );
  const { col: absoluteTargetCol } = getAbsoluteTableCells(
    {
      row: 0,
      col: toColIndex,
    },
    block,
    occupancyGrid,
  );

  /**
   * Currently, this function assumes that the caller has already checked that the source and target columns are valid.
   * Such as by using {@link canColumnBeDraggedInto}. In the future, we may want to have the move logic be smarter
   * and handle invalid column indices in some way.
   */
  occupancyGrid.forEach((row) => {
    // Move the cell to the target column
    const [sourceCell] = row.splice(absoluteSourceCol, 1);
    row.splice(absoluteTargetCol, 0, sourceCell);
  });

  return getTableRowsFromOccupancyGrid(occupancyGrid);
}

/**
 * This moves a row from one index to another.
 *
 * @note This is a destructive operation, it will modify the {@link OccupancyGrid} in place.
 */
export function moveRow(
  block: BlockFromConfigNoChildren<DefaultBlockSchema["table"], any, any>,
  fromRowIndex: RelativeCellIndices["row"],
  toRowIndex: RelativeCellIndices["row"],
  occupancyGrid: OccupancyGrid = getTableCellOccupancyGrid(block),
): TableContent<any, any>["rows"] {
  // To move cells in a column, we need to layout the whole table
  // and then move the cells accordingly.
  const { row: absoluteSourceRow } = getAbsoluteTableCells(
    {
      row: fromRowIndex,
      col: 0,
    },
    block,
    occupancyGrid,
  );
  const { row: absoluteTargetRow } = getAbsoluteTableCells(
    {
      row: toRowIndex,
      col: 0,
    },
    block,
    occupancyGrid,
  );

  /**
   * Currently, this function assumes that the caller has already checked that the source and target rows are valid.
   * Such as by using {@link canRowBeDraggedInto}. In the future, we may want to have the move logic be smarter
   * and handle invalid row indices in some way.
   */
  const [sourceRow] = occupancyGrid.splice(absoluteSourceRow, 1);
  occupancyGrid.splice(absoluteTargetRow, 0, sourceRow);

  return getTableRowsFromOccupancyGrid(occupancyGrid);
}

/**
 * This will check if a cell is empty.
 *
 * @returns True if the cell is empty, false otherwise.
 */
function isCellEmpty(
  cell:
    | PartialTableContent<any, any>["rows"][number]["cells"][number]
    | undefined,
): boolean {
  if (!cell) {
    return true;
  }
  if (isPartialTableCell(cell)) {
    return isCellEmpty(cell.content);
  } else if (typeof cell === "string") {
    return cell.length === 0;
  } else if (Array.isArray(cell)) {
    return cell.every((c) =>
      typeof c === "string"
        ? c.length === 0
        : isStyledTextInlineContent(c)
          ? c.text.length === 0
          : isPartialLinkInlineContent(c)
            ? typeof c.content === "string"
              ? c.content.length === 0
              : c.content.every((s) => s.text.length === 0)
            : false,
    );
  } else {
    return false;
  }
}

/**
 * This will remove empty rows or columns from the table.
 *
 * @note This is a destructive operation, it will modify the {@link OccupancyGrid} in place.
 */
export function cropEmptyRowsOrColumns(
  block: BlockFromConfigNoChildren<DefaultBlockSchema["table"], any, any>,
  removeEmpty: "columns" | "rows",
  occupancyGrid: OccupancyGrid = getTableCellOccupancyGrid(block),
): TableContent<any, any>["rows"] {
  if (removeEmpty === "columns") {
    // strips empty columns on the right
    let emptyColsOnRight = 0;
    for (
      let cellIndex = occupancyGrid[0].length - 1;
      cellIndex >= 0;
      cellIndex--
    ) {
      const isEmpty = occupancyGrid.every(
        (row) =>
          isCellEmpty(row[cellIndex].cell) && row[cellIndex].colspan === 1,
      );
      if (!isEmpty) {
        break;
      }

      emptyColsOnRight++;
    }

    for (let i = occupancyGrid.length - 1; i >= 0; i--) {
      // We maintain at least one cell, even if all the cells are empty
      const cellsToRemove = Math.max(
        occupancyGrid[i].length - emptyColsOnRight,
        1,
      );
      occupancyGrid[i] = occupancyGrid[i].slice(0, cellsToRemove);
    }

    return getTableRowsFromOccupancyGrid(occupancyGrid);
  }

  // strips empty rows at the bottom
  let emptyRowsOnBottom = 0;
  for (let rowIndex = occupancyGrid.length - 1; rowIndex >= 0; rowIndex--) {
    const isEmpty = occupancyGrid[rowIndex].every(
      (cell) => isCellEmpty(cell.cell) && cell.rowspan === 1,
    );
    if (!isEmpty) {
      break;
    }

    emptyRowsOnBottom++;
  }

  // We maintain at least one row, even if all the rows are empty
  const rowsToRemove = Math.min(emptyRowsOnBottom, occupancyGrid.length - 1);

  occupancyGrid.splice(occupancyGrid.length - rowsToRemove, rowsToRemove);

  return getTableRowsFromOccupancyGrid(occupancyGrid);
}

/**
 * This will add a specified number of rows or columns to the table (filling with empty cells).
 *
 * @note This is a destructive operation, it will modify the {@link OccupancyGrid} in place.
 */
export function addRowsOrColumns(
  block: BlockFromConfigNoChildren<DefaultBlockSchema["table"], any, any>,
  addType: "columns" | "rows",
  /**
   * The number of rows or columns to add.
   *
   * @note if negative, it will remove rows or columns.
   */
  numToAdd: number,
  occupancyGrid: OccupancyGrid = getTableCellOccupancyGrid(block),
): TableContent<any, any>["rows"] {
  const { width, height } = getDimensionsOfTable(block);

  if (addType === "columns") {
    // Add empty columns to the right
    occupancyGrid.forEach((row, rowIndex) => {
      if (numToAdd >= 0) {
        for (let i = 0; i < numToAdd; i++) {
          row.push({
            row: rowIndex,
            col: Math.max(...row.map((r) => r.col)) + 1,
            rowspan: 1,
            colspan: 1,
            cell: mapTableCell(""),
          });
        }
      } else {
        // Remove columns on the right
        row.splice(width + numToAdd, -1 * numToAdd);
      }
    });
  } else {
    if (numToAdd > 0) {
      // Add empty rows to the bottom
      for (let i = 0; i < numToAdd; i++) {
        const newRow = new Array(width).fill(null).map((_, colIndex) => ({
          row: height + i,
          col: colIndex,
          rowspan: 1,
          colspan: 1,
          cell: mapTableCell(""),
        }));
        occupancyGrid.push(newRow);
      }
    } else if (numToAdd < 0) {
      // Remove rows at the bottom
      occupancyGrid.splice(height + numToAdd, -1 * numToAdd);
    }
  }

  return getTableRowsFromOccupancyGrid(occupancyGrid);
}

/**
 * Checks if a row can be safely dropped at the target row index without splitting merged cells.
 */
export function canRowBeDraggedInto(
  block: BlockFromConfigNoChildren<DefaultBlockSchema["table"], any, any>,
  draggingIndex: RelativeCellIndices["row"],
  targetRowIndex: RelativeCellIndices["row"],
) {
  // Check cells at the target row
  const targetCells = getCellsAtRowHandle(block, targetRowIndex);

  // If no cells have rowspans > 1, dragging is always allowed
  const hasMergedCells = targetCells.some((cell) => getRowspan(cell.cell) > 1);
  if (!hasMergedCells) {
    return true;
  }

  let endRowIndex = targetRowIndex;
  let startRowIndex = targetRowIndex;
  targetCells.forEach((cell) => {
    const rowspan = getRowspan(cell.cell);
    endRowIndex = Math.max(endRowIndex, cell.row + rowspan - 1);
    startRowIndex = Math.min(startRowIndex, cell.row);
  });

  // Check the direction of the drag
  const isDraggingDown = draggingIndex < targetRowIndex;

  // Allow dragging only at the start/end of merged cells
  // Otherwise, the target row was within a merged cell which we don't allow
  return isDraggingDown
    ? targetRowIndex === endRowIndex
    : targetRowIndex === startRowIndex;
}

/**
 * Checks if a column can be safely dropped at the target column index without splitting merged cells.
 */
export function canColumnBeDraggedInto(
  block: BlockFromConfigNoChildren<DefaultBlockSchema["table"], any, any>,
  draggingIndex: RelativeCellIndices["col"],
  targetColumnIndex: RelativeCellIndices["col"],
) {
  // Check cells at the target column
  const targetCells = getCellsAtColumnHandle(block, targetColumnIndex);

  // If no cells have colspans > 1, dragging is always allowed
  const hasMergedCells = targetCells.some((cell) => getColspan(cell.cell) > 1);
  if (!hasMergedCells) {
    return true;
  }

  let endColumnIndex = targetColumnIndex;
  let startColumnIndex = targetColumnIndex;
  targetCells.forEach((cell) => {
    const colspan = getColspan(cell.cell);
    endColumnIndex = Math.max(endColumnIndex, cell.col + colspan - 1);
    startColumnIndex = Math.min(startColumnIndex, cell.col);
  });

  // Check the direction of the drag
  const isDraggingRight = draggingIndex < targetColumnIndex;

  // Allow dragging only at the start/end of merged cells
  // Otherwise, the target column was within a merged cell which we don't allow
  return isDraggingRight
    ? targetColumnIndex === endColumnIndex
    : targetColumnIndex === startColumnIndex;
}

/**
 * Checks if two cells are in the same column.
 *
 * @returns True if the cells are in the same column, false otherwise.
 */
export function areInSameColumn(
  from: RelativeCellIndices,
  to: RelativeCellIndices,
  block: BlockFromConfigNoChildren<DefaultBlockSchema["table"], any, any>,
) {
  // Table indices are relative to the table, so we need to resolve the absolute cell indices
  const anchorAbsoluteCellIndices = getAbsoluteTableCells(from, block);

  // Table indices are relative to the table, so we need to resolve the absolute cell indices
  const headAbsoluteCellIndices = getAbsoluteTableCells(to, block);

  // Compare the column indices to determine the merge direction
  return anchorAbsoluteCellIndices.col === headAbsoluteCellIndices.col;
}
