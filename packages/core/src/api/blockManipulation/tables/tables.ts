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
 * This will resolve the relative cell indices within the table block to the absolute cell indices within the table.
 * Accounts for colspan and rowspan.
 *
 * @returns The absolute cell indices (row and column).
 */
export function resolveRelativeTableCellIndices(
  /**
   * The relative position of the cell in the table.
   */
  relativeCellIndices: { row: number; col: number },
  /**
   * The table block containing the cell.
   */
  block: BlockFromConfigNoChildren<DefaultBlockSchema["table"], any, any>
): { row: number; col: number } {
  // Calculate column index by summing colspan values of previous cells in the row
  let colIndex = 0;
  for (let i = 0; i < relativeCellIndices.col; i++) {
    const cell = block.content.rows[relativeCellIndices.row].cells[i];
    colIndex += getColspan(cell);
  }

  // Calculate row index by summing rowspan values of cells in previous rows
  let rowIndex = 0;
  for (let i = 0; i < relativeCellIndices.row; i++) {
    const cell = block.content.rows[i].cells[relativeCellIndices.col];
    rowIndex += getRowspan(cell);
  }

  return { row: rowIndex, col: colIndex };
}

/**
 * This will get the dimensions of the table block.
 *
 * @returns The height and width of the table.
 */
export function getDimensionsOfTable(
  block: BlockFromConfigNoChildren<DefaultBlockSchema["table"], any, any>
) {
  const height = block.content.rows.length;
  const width = block.content.rows.reduce((acc, { cells }) => {
    return Math.max(
      acc,
      cells.reduce((acc, cell) => {
        return acc + getColspan(cell);
      }, 0)
    );
  }, 0);

  return { height, width };
}
/**
 * An occupancy grid is a grid of the occupied cells in the table.
 * It is used to track the occupied cells in the table to know where to place the next cell.
 */
type OccupancyGrid = {
  /**
   * The row index of the cell.
   */
  row: number;
  /**
   * The column index of the cell.
   */
  col: number;
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
}[][];

/**
 * This will return a grid of the occupied cells in the table.
 *
 * @returns The grid of occupied cells.
 */
export function getTableCellOccupancyGrid(
  block: BlockFromConfigNoChildren<DefaultBlockSchema["table"], any, any>
): OccupancyGrid | null {
  const { height, width } = getDimensionsOfTable(block);

  /*
   * Create a grid to track occupied cells
   * This is used because rowspans and colspans take up multiple spaces
   * So, we need to track the occupied cells in the grid to know where to place the next cell
   */
  const grid: ({
    row: number;
    col: number;
    rowspan: number;
    colspan: number;
    cell: TableCell<any, any>;
  } | null)[][] = new Array(height)
    .fill(false)
    .map(() => new Array(width).fill(null));

  // Find the next unoccupied cell in the table, row-major order
  function findNextAvailable(row: number, col: number) {
    for (let i = row; i < height; i++) {
      for (let j = col; j < width; j++) {
        if (!grid[i][j]) {
          return { row: i, col: j };
        }
      }
    }
    return null;
  }

  // Build up the grid, trying to fill in the cells with the correct relative row and column indices
  for (let row = 0; row < block.content.rows.length; row++) {
    for (let col = 0; col < block.content.rows[row].cells.length; col++) {
      const cell = mapTableCell(block.content.rows[row].cells[col]);
      const rowspan = getRowspan(cell);
      const colspan = getColspan(cell);

      // Rowspan and colspan complicate things, by taking up multiple cells in the grid
      // We need to iterate over the cells that the rowspan and colspan take up
      // and fill in the grid with the correct relative row and column indices
      const nextAvailableCell = findNextAvailable(row, col);

      if (nextAvailableCell === null) {
        // No more available cells in the table, the table is invalid
        return null;
      }

      const { row: startRow, col: startCol } = nextAvailableCell;

      // Fill in the rowspan X colspan cells, starting from the next available cell, with the correct relative row and column indices
      for (let i = startRow; i < startRow + rowspan; i++) {
        for (let j = startCol; j < startCol + colspan; j++) {
          if (grid[i][j]) {
            // The cell is already occupied, the table is invalid
            return null;
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

  function isOccupancyGrid(grid: any[][]): grid is OccupancyGrid {
    return grid.every((row) =>
      row.every((cell) => cell !== null && typeof cell === "object")
    );
  }

  if (!isOccupancyGrid(grid)) {
    // The table is missing cells, so it is invalid
    return null;
  }

  return grid;
}

/**
 * This will resolve the absolute cell indices within the table block to the relative cell indices within the table.
 * Accounts for colspan and rowspan.
 *
 * @returns The relative cell indices (row and column).
 */
export function resolveAbsoluteTableCellIndices(
  /**
   * The absolute position of the cell in the table.
   */
  absoluteCellIndices: { row: number; col: number },
  /**
   * The table block containing the cell.
   */
  block: BlockFromConfigNoChildren<DefaultBlockSchema["table"], any, any>,
  /**
   * The occupancy grid of the table.
   */
  occupancyGrid: OccupancyGrid | null = getTableCellOccupancyGrid(block)
): {
  row: number;
  col: number;
  cell: TableContent<any, any>["rows"][number]["cells"][number];
} | null {
  if (!occupancyGrid) {
    // The table is missing cells, so it is invalid
    return null;
  }

  const occupancyCell =
    occupancyGrid[absoluteCellIndices.row]?.[absoluteCellIndices.col];

  // Double check that the cell can be accessed
  if (!occupancyCell) {
    // The cell is not occupied, so it is invalid
    return null;
  }

  return {
    row: occupancyCell.row,
    col: occupancyCell.col,
    cell: occupancyCell.cell,
  };
}

/**
 * This will get all the cells in a row of the table block.
 *
 * @returns The row of the table.
 */
export function getRow(
  block: BlockFromConfigNoChildren<DefaultBlockSchema["table"], any, any>,
  relativeRowIndex: number
) {
  const occupancyGrid = getTableCellOccupancyGrid(block);
  if (!occupancyGrid) {
    throw new Error("Table is malformed");
  }
  const { width } = getDimensionsOfTable(block);
  // First need to resolve the relative row index to an absolute row index
  const { row: absoluteRow } = resolveRelativeTableCellIndices(
    { row: relativeRowIndex, col: 0 },
    block
  );

  // Then for each column, get the cell at the absolute row index as a relative cell index
  const cells = new Array(width).fill(false).map((_v, col) => {
    return resolveAbsoluteTableCellIndices(
      { row: absoluteRow, col },
      block,
      occupancyGrid
    );
  });

  // Filter out duplicates based on row and col properties
  return cells.filter((cell, index) => {
    return (
      cell &&
      cells.findIndex((c) => c && c.row === cell.row && c.col === cell.col) ===
        index
    );
  });
}

/**
 * This will get all the cells in a column of the table block.
 *
 * @returns The column of the table.
 */
export function getColumn(
  block: BlockFromConfigNoChildren<DefaultBlockSchema["table"], any, any>,
  relativeColumnIndex: number
) {
  const occupancyGrid = getTableCellOccupancyGrid(block);
  if (!occupancyGrid) {
    throw new Error("Table is malformed");
  }
  const { height } = getDimensionsOfTable(block);
  // First need to resolve the relative column index to an absolute column index
  const { col: absoluteCol } = resolveRelativeTableCellIndices(
    { row: 0, col: relativeColumnIndex },
    block
  );

  // Then for each row, get the cell at the absolute column index as a relative cell index
  const cells = new Array(height).fill(false).map((_v, row) => {
    return resolveAbsoluteTableCellIndices(
      { row, col: absoluteCol },
      block,
      occupancyGrid
    );
  });

  // Filter out duplicates based on row and col properties
  return cells.filter((cell, index) => {
    return (
      cell &&
      cells.findIndex((c) => c && c.row === cell.row && c.col === cell.col) ===
        index
    );
  });
}
