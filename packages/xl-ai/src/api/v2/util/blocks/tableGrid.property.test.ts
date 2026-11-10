// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";

import { fitTable } from "../../fit/fitTable.js";
import type { LensTableCell, LensTableContent } from "../../model.js";
import { createRandom, type Random } from "../../testUtil/random.js";
import {
  cellRows,
  emptyCell,
  gridOf,
  hasMergedCells,
  withoutMergedCells,
} from "./tableGrid.js";

function cell(text: string, colspan = 1, rowspan = 1): LensTableCell {
  return {
    type: "tableCell",
    props: {
      colspan,
      rowspan,
      backgroundColor: "default",
      textColor: "default",
      textAlignment: "left",
    },
    content: text === "" ? [] : [{ type: "text", text, styles: {} }],
  };
}

function table(rows: LensTableCell[][]): LensTableContent {
  return {
    type: "tableContent",
    columnWidths: [],
    rows: rows.map((cells) => ({ cells })),
  };
}

/** A random table: 0 to 4 rows of 0 to 4 cells, some with spans. */
function randomTable(random: Random): LensTableContent {
  let next = 0;
  return table(
    Array.from({ length: random.int(5) }, () =>
      Array.from({ length: random.int(5) }, () =>
        cell(
          `c${next++}`,
          random.chance(0.2) ? 2 : 1,
          random.chance(0.2) ? 1 + random.int(3) : 1,
        ),
      ),
    ),
  );
}

/** The text of the cells in grid order, without empty cells. */
function texts(content: LensTableContent): string[] {
  return cellRows(content)
    .flat()
    .flatMap((each) =>
      each.content.map((item) => (item as { text: string }).text),
    );
}

/** The naive grid: places each cell on a matrix, and returns undefined if the spans do not fit. */
function naiveGrid(rows: readonly LensTableCell[][]) {
  const size = 32;
  const matrix = rows.map(() => new Array<boolean>(size).fill(false));
  const columns: number[][] = [];
  for (let r = 0; r < rows.length; r++) {
    const own: number[] = [];
    let column = 0;
    for (const each of rows[r]) {
      while (matrix[r][column]) {
        column++;
      }
      own.push(column);
      const colspan = each.props.colspan as number;
      const rowspan = each.props.rowspan as number;
      for (let dr = 0; dr < rowspan; dr++) {
        for (let dc = 0; dc < colspan; dc++) {
          if (r + dr >= rows.length || matrix[r + dr][column + dc]) {
            return undefined;
          }
          matrix[r + dr][column + dc] = true;
        }
      }
      column += colspan;
    }
    columns.push(own);
  }
  const widths = matrix.map((row) => row.lastIndexOf(true) + 1);
  // A position without a cell before a position with a cell.
  if (matrix.some((row, r) => row.slice(0, widths[r]).includes(false))) {
    return undefined;
  }
  return { columns, widths };
}

describe("gridOf: properties", () => {
  it("gives the same grid as a naive placement on a matrix", () => {
    const random = createRandom(111);
    for (let run = 0; run < 500; run++) {
      const rows = cellRows(randomTable(random));
      expect(gridOf(rows)).toEqual(naiveGrid(rows));
    }
  });

  it("gives each row of a table without spans its cells in order", () => {
    const random = createRandom(112);
    for (let run = 0; run < 100; run++) {
      const rows = Array.from({ length: random.int(5) }, () =>
        Array.from({ length: random.int(5) }, () => cell("x")),
      );
      expect(gridOf(rows)).toEqual({
        columns: rows.map((cells) => cells.map((_, c) => c)),
        widths: rows.map((cells) => cells.length),
      });
    }
  });
});

describe("withoutMergedCells: properties", () => {
  it("gives a table without merged cells, with the same rows and the same texts in grid order", () => {
    const random = createRandom(113);
    for (let run = 0; run < 500; run++) {
      const content = randomTable(random);
      const result = withoutMergedCells(content);
      expect(hasMergedCells(result)).toBe(false);
      expect(result.rows).toHaveLength(content.rows.length);
      expect(texts(result)).toEqual(texts(content));
      if (gridOf(cellRows(content)) !== undefined) {
        // Each row has the full width.
        const widths = result.rows.map((row) => row.cells.length);
        expect(new Set(widths).size).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("fitTable: properties", () => {
  it("gives a table that fits the grid, with equal widths, and a second fit does not change it", () => {
    const random = createRandom(114);
    for (let run = 0; run < 500; run++) {
      const content = randomTable(random);
      const result = fitTable(content);
      const grid = gridOf(cellRows(result));
      expect(grid).toBeDefined();
      expect(new Set(grid!.widths).size).toBeLessThanOrEqual(1);
      expect(fitTable(result)).toEqual(result);
      expect(texts(result)).toEqual(texts(content));
    }
  });
});

describe("tableGrid: edge cases", () => {
  it("uses the span 1 for a span that is not an integer of at least 1", () => {
    for (const span of [0, -1, 1.5, Number.NaN, "2", undefined]) {
      const odd: LensTableCell = {
        ...cell("x"),
        props: { colspan: span, rowspan: span },
      };
      expect(hasMergedCells(table([[odd]]))).toBe(false);
      expect(gridOf([[odd, cell("y")]])).toEqual({
        columns: [[0, 1]],
        widths: [2],
      });
    }
  });

  it("gives no grid for a cell that spans below the last row", () => {
    expect(gridOf([[cell("x", 1, 2)]])).toBeUndefined();
  });

  it("gives no grid for a row with a position without a cell before a position with a cell", () => {
    // The cell "b" of the first row spans into the second column of the
    // second row. The first column of the second row has no cell.
    expect(gridOf([[cell("a"), cell("b", 1, 2)], []])).toBeUndefined();
  });

  it("gives a grid for a table without rows and for rows without cells", () => {
    expect(gridOf([])).toEqual({ columns: [], widths: [] });
    expect(gridOf([[], []])).toEqual({ columns: [[], []], widths: [0, 0] });
  });

  it("gives the second row a cell after a cell that spans two rows", () => {
    expect(gridOf([[cell("a", 1, 2), cell("b")], [cell("c")]])).toEqual({
      columns: [[0, 1], [1]],
      widths: [2, 2],
    });
  });

  it("gives an empty cell to each position that a merged cell covered", () => {
    expect(
      withoutMergedCells(table([[cell("a", 2, 1)], [cell("b"), cell("c")]])),
    ).toEqual(
      table([
        [cell("a"), emptyCell()],
        [cell("b"), cell("c")],
      ]),
    );
  });

  it("gives a short row empty cells at its end, also if the table has merged cells", () => {
    // The doc comment names only the positions of merged cells, but the
    // result also fills the short row.
    expect(
      withoutMergedCells(table([[cell("a", 2, 1), cell("b")], [cell("c")]])),
    ).toEqual(
      table([
        [cell("a"), emptyCell(), cell("b")],
        [cell("c"), emptyCell(), emptyCell()],
      ]),
    );
  });

  it("gives a new empty cell object for each call", () => {
    expect(emptyCell()).not.toBe(emptyCell());
    expect(emptyCell().props).not.toBe(emptyCell().props);
  });
});
