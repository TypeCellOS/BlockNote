import { DefaultBlockSchema } from "../../../blocks/defaultBlocks.js";
import {
  BlockFromConfigNoChildren,
  getColspan,
  getRowspan,
  mapTableCell,
  TableCell,
  TableContent,
} from "../../../schema/blocks/types.js";

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
type OccupancyGrid = (AbsoluteCellIndices & {
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
  block: BlockFromConfigNoChildren<DefaultBlockSchema["table"], any, any>
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
      "Unable to create occupancy grid for table, no more available cells"
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
              `Unable to create occupancy grid for table, cell at ${i},${j} is already occupied`
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

  return grid;
}

/**
 * This will resolve the relative cell indices within the table block to the absolute cell indices within the table, accounting for colspan and rowspan.
 *
 * @note It will return only the first cell (i.e. top-left) that matches the relative cell indices. To find the other absolute cell indices this cell occupies, you can assume it is the rowspan and colspan number of cells away from the top-left cell.
 *
 * @returns The {@link AbsoluteCellIndices} and the {@link TableCell} at the absolute position.
 */
export function getAbsoluteTableCellIndices(
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
  occupancyGrid: OccupancyGrid = getTableCellOccupancyGrid(block)
): AbsoluteCellIndices & {
  cell: TableCell<any, any>;
} {
  for (let r = 0; r < occupancyGrid.length; r++) {
    for (let c = 0; c < occupancyGrid[r].length; c++) {
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
    `Unable to resolve relative table cell indices for table, cell at ${relativeCellIndices.row},${relativeCellIndices.col} is not occupied`
  );
}

/**
 * This will get the dimensions of the table block.
 *
 * @returns The height and width of the table.
 */
export function getDimensionsOfTable(
  block: BlockFromConfigNoChildren<DefaultBlockSchema["table"], any, any>
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
export function getRelativeTableCellIndices(
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
  occupancyGrid: OccupancyGrid = getTableCellOccupancyGrid(block)
): RelativeCellIndices & {
  cell: TableContent<any, any>["rows"][number]["cells"][number];
} {
  const occupancyCell =
    occupancyGrid[absoluteCellIndices.row]?.[absoluteCellIndices.col];

  // Double check that the cell can be accessed
  if (!occupancyCell) {
    // The cell is not occupied, so it is invalid
    throw new Error(
      `Unable to resolve absolute table cell indices for table, cell at ${absoluteCellIndices.row},${absoluteCellIndices.col} is not occupied`
    );
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
  relativeRowIndex: RelativeCellIndices["row"]
) {
  try {
    const occupancyGrid = getTableCellOccupancyGrid(block);

    let absoluteRow = 0;

    // Jump through the occupied cells ${relativeCellIndices.row} times to find the absolute row position
    for (let i = 0; i < relativeRowIndex; i++) {
      const cell = occupancyGrid[absoluteRow]?.[0];

      if (!cell) {
        // As a sanity check, if the cell is not occupied, we should throw an error
        throw new Error(
          `Unable to resolve relative table cell indices for table, cell at ${absoluteRow},0 is not occupied`
        );
      }

      // Skip the cells that the rowspan takes up
      absoluteRow += cell.rowspan;
    }

    // Then for each column, get the cell at the absolute row index as a relative cell index
    const cells = new Array(occupancyGrid[0].length)
      .fill(false)
      .map((_v, col) => {
        return getRelativeTableCellIndices(
          { row: absoluteRow, col },
          block,
          occupancyGrid
        );
      });

    // Filter out duplicates based on row and col properties
    return cells.filter((cell, index) => {
      return (
        cells.findIndex((c) => c.row === cell.row && c.col === cell.col) ===
        index
      );
    });
  } catch (e) {
    // In case of an invalid index, return an empty array
    return [];
  }
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
  relativeColumnIndex: RelativeCellIndices["col"]
) {
  try {
    const occupancyGrid = getTableCellOccupancyGrid(block);
    // First need to resolve the relative column index to an absolute column index

    let absoluteCol = 0;

    // Now that we've already resolved the absolute row position, we can jump through the occupied cells ${relativeCellIndices.col} times to find the absolute column position
    for (let i = 0; i < relativeColumnIndex; i++) {
      const cell = occupancyGrid[0]?.[absoluteCol];

      if (!cell) {
        // As a sanity check, if the cell is not occupied, we should throw an error
        throw new Error(
          `Unable to resolve relative table cell indices for table, cell at 0,${absoluteCol} is not occupied`
        );
      }

      // Skip the cells that the colspan takes up
      absoluteCol += cell.colspan;
    }

    // Then for each row, get the cell at the absolute column index as a relative cell index
    const cells = new Array(occupancyGrid.length).fill(false).map((_v, row) => {
      return getRelativeTableCellIndices(
        { row, col: absoluteCol },
        block,
        occupancyGrid
      );
    });

    // Filter out duplicates based on row and col properties
    return cells.filter((cell, index) => {
      return (
        cells.findIndex((c) => c.row === cell.row && c.col === cell.col) ===
        index
      );
    });
  } catch (e) {
    // In case of an invalid index, return an empty array
    return [];
  }
}
