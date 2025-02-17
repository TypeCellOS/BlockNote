import { Block, DefaultBlockSchema } from "../../../blocks/defaultBlocks.js";
import { isTableCell, TableContent } from "../../../schema/blocks/types.js";

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
  block: Block<
    {
      table: DefaultBlockSchema["table"];
    },
    any,
    any
  >
): { row: number; col: number } {
  // Calculate column index by summing colspan values of previous cells in the row
  let colIndex = 0;
  for (let i = 0; i < relativeCellIndices.col; i++) {
    const cell = block.content.rows[relativeCellIndices.row].cells[i];
    colIndex += isTableCell(cell) ? cell.props?.colspan ?? 1 : 1;
  }

  // Calculate row index by summing rowspan values of cells in previous rows
  let rowIndex = 0;
  for (let i = 0; i < relativeCellIndices.row; i++) {
    const cell = block.content.rows[i].cells[relativeCellIndices.col];
    rowIndex += isTableCell(cell) ? cell.props?.rowspan ?? 1 : 1;
  }

  return { row: rowIndex, col: colIndex };
}

/**
 * This will get the dimensions of the table block.
 *
 * @returns The height and width of the table.
 */
export function getDimensionsOfTable(
  block: Block<{ table: DefaultBlockSchema["table"] }, any, any>
) {
  const height = block.content.rows.length;
  const width = block.content.rows.reduce((acc, { cells }) => {
    return Math.max(
      acc,
      cells.reduce((acc, cell) => {
        return acc + (isTableCell(cell) ? cell.props?.colspan ?? 1 : 1);
      }, 0)
    );
  }, 0);

  return { height, width };
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
  block: Block<
    {
      table: DefaultBlockSchema["table"];
    },
    any,
    any
  >
): {
  row: number;
  col: number;
  cell: TableContent<any, any>["rows"][number]["cells"][number];
} | null {
  const { height, width } = getDimensionsOfTable(block);

  /*
   * Create a grid to track occupied cells
   * This is used because rowspans and colspans take up multiple spaces
   * So, we need to track the occupied cells in the grid to know where to place the next cell
   */
  const grid: boolean[][] = new Array(height)
    .fill(false)
    .map(() => new Array(width).fill(false));

  if (absoluteCellIndices.row >= height || absoluteCellIndices.col >= width) {
    return null;
  }

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
      const cell = block.content.rows[row].cells[col];
      const rowspan = isTableCell(cell) ? cell.props?.rowspan ?? 1 : 1;
      const colspan = isTableCell(cell) ? cell.props?.colspan ?? 1 : 1;

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

          grid[i][j] = true;

          if (i === absoluteCellIndices.row && j === absoluteCellIndices.col) {
            // If the cell is occupied, return the relative cell indices
            return {
              row,
              col,
              cell,
            };
          }
        }
      }
    }
  }

  // We did not find the cell, so return null
  return null;
}

/**
 * This will get all the cells in a row of the table block.
 *
 * @returns The row of the table.
 */
export function getRow(
  block: Block<{ table: DefaultBlockSchema["table"] }, any, any>,
  relativeRowIndex: number
) {
  const { width } = getDimensionsOfTable(block);
  // First need to resolve the relative row index to an absolute row index
  const { row: absoluteRow } = resolveRelativeTableCellIndices(
    { row: relativeRowIndex, col: 0 },
    block
  );

  // Then for each column, get the cell at the absolute row index as a relative cell index
  const cells = new Array(width).fill(false).map((_v, col) => {
    return resolveAbsoluteTableCellIndices({ row: absoluteRow, col }, block)!;
  });

  // Filter out duplicates based on row and col properties
  return cells.filter((cell, index) => {
    return (
      cells.findIndex((c) => c.row === cell.row && c.col === cell.col) === index
    );
  });
}

/**
 * This will get all the cells in a column of the table block.
 *
 * @returns The column of the table.
 */
export function getColumn(
  block: Block<{ table: DefaultBlockSchema["table"] }, any, any>,
  relativeColumnIndex: number
) {
  const { height } = getDimensionsOfTable(block);
  // First need to resolve the relative column index to an absolute column index
  const { col: absoluteCol } = resolveRelativeTableCellIndices(
    { row: 0, col: relativeColumnIndex },
    block
  );

  // Then for each row, get the cell at the absolute column index as a relative cell index
  const cells = new Array(height).fill(false).map((_v, row) => {
    return resolveAbsoluteTableCellIndices({ row, col: absoluteCol }, block)!;
  });

  // Filter out duplicates based on row and col properties
  return cells.filter((cell, index) => {
    return (
      cells.findIndex((c) => c.row === cell.row && c.col === cell.col) === index
    );
  });
}
