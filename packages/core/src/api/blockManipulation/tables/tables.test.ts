import { describe, expect, it } from "vitest";

import { Block, DefaultBlockSchema } from "../../../blocks/defaultBlocks.js";
import {
  getCellsAtColumnHandle,
  getCellsAtRowHandle,
  getRelativeTableCells,
  getAbsoluteTableCells,
  moveColumn,
  moveRow,
  cropEmptyRowsOrColumns,
} from "./tables.js";

/**
 *  Simple table
 *  | 1-1 | 1-2 | 1-3 |
 *  | 2-1 | 2-2 | 2-3 |
 */
const simpleTable = {
  type: "table",
  id: "table-0",
  props: {
    textColor: "default",
  },
  content: {
    type: "tableContent",
    columnWidths: [100, 100],
    rows: [
      {
        cells: [
          {
            type: "tableCell",
            props: {
              backgroundColor: "default",
              textColor: "default",
              textAlignment: "left",
              colspan: 1,
              rowspan: 1,
            },
            content: [{ type: "text", text: "1-1", styles: {} }],
          },
          {
            type: "tableCell",
            props: {
              backgroundColor: "default",
              textColor: "default",
              textAlignment: "left",
              colspan: 1,
              rowspan: 1,
            },
            content: [{ type: "text", text: "1-2", styles: {} }],
          },
        ],
      },
      {
        cells: [
          {
            type: "tableCell",
            props: {
              backgroundColor: "default",
              textColor: "default",
              textAlignment: "left",
              colspan: 1,
              rowspan: 1,
            },
            content: [{ type: "text", text: "2-1", styles: {} }],
          },
          {
            type: "tableCell",
            props: {
              backgroundColor: "default",
              textColor: "default",
              textAlignment: "left",
              colspan: 1,
              rowspan: 1,
            },
            content: [{ type: "text", text: "2-2", styles: {} }],
          },
        ],
      },
    ],
  },
  children: [],
} satisfies Block<
  {
    table: DefaultBlockSchema["table"];
  },
  any,
  any
>;

/**
 *  Normal table
 *  | 1-1 | 1-2 | 1-3 |
 *  | 2-1 | 2-2 | 2-3 |
 *
 *  Table with colspan
 *  | 1-1 | 1-1 | 1-2 |
 *  | 2-1 | 2-2 | 2-3 |
 */
const tableWithColspan = {
  type: "table",
  id: "table-0",
  props: {
    textColor: "default",
  },
  content: {
    type: "tableContent",
    columnWidths: [100, 100],
    rows: [
      {
        cells: [
          {
            type: "tableCell",
            props: {
              backgroundColor: "default",
              textColor: "default",
              textAlignment: "left",
              colspan: 2,
              rowspan: 1,
            },
            content: [
              { type: "text", text: "1-1", styles: {} },
              { type: "text", text: "1-2", styles: {} },
            ],
          },
          {
            type: "tableCell",
            props: {
              backgroundColor: "default",
              textColor: "default",
              textAlignment: "left",
              colspan: 1,
              rowspan: 1,
            },
            content: [{ type: "text", text: "1-3", styles: {} }],
          },
        ],
      },
      {
        cells: [
          {
            type: "tableCell",
            props: {
              backgroundColor: "default",
              textColor: "default",
              textAlignment: "left",
              colspan: 1,
              rowspan: 1,
            },
            content: [{ type: "text", text: "2-1", styles: {} }],
          },
          {
            type: "tableCell",
            props: {
              backgroundColor: "default",
              textColor: "default",
              textAlignment: "left",
              colspan: 1,
              rowspan: 1,
            },
            content: [{ type: "text", text: "2-2", styles: {} }],
          },
          {
            type: "tableCell",
            props: {
              backgroundColor: "default",
              textColor: "default",
              textAlignment: "left",
              colspan: 1,
              rowspan: 1,
            },
            content: [{ type: "text", text: "2-3", styles: {} }],
          },
        ],
      },
    ],
  },
  children: [],
} satisfies Block<
  {
    table: DefaultBlockSchema["table"];
  },
  any,
  any
>;

/**
 *  Normal table
 *  | 1-1 | 1-2 | 1-3 |
 *  | 2-1 | 2-2 | 2-3 |
 *  | 3-1 | 3-2 | 3-3 |
 *
 *  Table with rowspan
 *  | 1-1 | 1-2 | 1-3 |
 *  | 1-1 | 2-1 | 2-2 |
 *  | 3-1 | 3-2 | 3-3 |
 */
const tableWithRowspan = {
  type: "table",
  id: "table-0",
  props: {
    textColor: "default",
  },
  content: {
    type: "tableContent",
    columnWidths: [100, 100],
    rows: [
      {
        cells: [
          {
            type: "tableCell",
            props: {
              backgroundColor: "default",
              textColor: "default",
              textAlignment: "left",
              colspan: 1,
              rowspan: 2,
            },
            content: [
              { type: "text", text: "1-1", styles: {} },
              { type: "text", text: "2-1", styles: {} },
            ],
          },
          {
            type: "tableCell",
            props: {
              backgroundColor: "default",
              textColor: "default",
              textAlignment: "left",
              colspan: 1,
              rowspan: 1,
            },
            content: [{ type: "text", text: "1-2", styles: {} }],
          },
          {
            type: "tableCell",
            props: {
              backgroundColor: "default",
              textColor: "default",
              textAlignment: "left",
              colspan: 1,
              rowspan: 1,
            },
            content: [{ type: "text", text: "1-3", styles: {} }],
          },
        ],
      },
      {
        cells: [
          {
            type: "tableCell",
            props: {
              backgroundColor: "default",
              textColor: "default",
              textAlignment: "left",
              colspan: 1,
              rowspan: 1,
            },
            content: [{ type: "text", text: "2-2", styles: {} }],
          },
          {
            type: "tableCell",
            props: {
              backgroundColor: "default",
              textColor: "default",
              textAlignment: "left",
              colspan: 1,
              rowspan: 1,
            },
            content: [{ type: "text", text: "2-3", styles: {} }],
          },
        ],
      },
      {
        cells: [
          {
            type: "tableCell",
            props: {
              backgroundColor: "default",
              textColor: "default",
              textAlignment: "left",
              colspan: 1,
              rowspan: 1,
            },
            content: [{ type: "text", text: "3-1", styles: {} }],
          },
          {
            type: "tableCell",
            props: {
              backgroundColor: "default",
              textColor: "default",
              textAlignment: "left",
              colspan: 1,
              rowspan: 1,
            },
            content: [{ type: "text", text: "3-2", styles: {} }],
          },
          {
            type: "tableCell",
            props: {
              backgroundColor: "default",
              textColor: "default",
              textAlignment: "left",
              colspan: 1,
              rowspan: 1,
            },
            content: [{ type: "text", text: "3-3", styles: {} }],
          },
        ],
      },
    ],
  },
  children: [],
} satisfies Block<
  {
    table: DefaultBlockSchema["table"];
  },
  any,
  any
>;

/**
 *  Normal table
 *  | 1-1 | 1-2 | 1-3 |
 *  | 2-1 | 2-2 | 2-3 |
 *  | 3-1 | 3-2 | 3-3 |
 *
 *  Table with colspan and rowspan
 *  | 1-1 | 1-2 | 1-3 |
 *  | 1-1 | 2-1 | 2-1 |
 *  | 3-1 | 3-2 | 3-3 |
 */
const tableWithColspanAndRowspan = {
  type: "table",
  id: "table-0",
  props: {
    textColor: "default",
  },
  content: {
    type: "tableContent",
    columnWidths: [100, 100],
    rows: [
      {
        cells: [
          {
            type: "tableCell",
            props: {
              backgroundColor: "default",
              textColor: "default",
              textAlignment: "left",
              colspan: 1,
              rowspan: 2,
            },
            content: [
              { type: "text", text: "1-1", styles: {} },
              { type: "text", text: "2-1", styles: {} },
            ],
          },
          {
            type: "tableCell",
            props: {
              backgroundColor: "default",
              textColor: "default",
              textAlignment: "left",
              colspan: 1,
              rowspan: 1,
            },
            content: [{ type: "text", text: "1-2", styles: {} }],
          },
          {
            type: "tableCell",
            props: {
              backgroundColor: "default",
              textColor: "default",
              textAlignment: "left",
              colspan: 1,
              rowspan: 1,
            },
            content: [{ type: "text", text: "1-3", styles: {} }],
          },
        ],
      },
      {
        cells: [
          {
            type: "tableCell",
            props: {
              backgroundColor: "default",
              textColor: "default",
              textAlignment: "left",
              colspan: 2,
              rowspan: 1,
            },
            content: [
              { type: "text", text: "2-2", styles: {} },
              { type: "text", text: "2-3", styles: {} },
            ],
          },
        ],
      },
      {
        cells: [
          {
            type: "tableCell",
            props: {
              backgroundColor: "default",
              textColor: "default",
              textAlignment: "left",
              colspan: 1,
              rowspan: 1,
            },
            content: [{ type: "text", text: "3-1", styles: {} }],
          },
          {
            type: "tableCell",
            props: {
              backgroundColor: "default",
              textColor: "default",
              textAlignment: "left",
              colspan: 1,
              rowspan: 1,
            },
            content: [{ type: "text", text: "3-2", styles: {} }],
          },
          {
            type: "tableCell",
            props: {
              backgroundColor: "default",
              textColor: "default",
              textAlignment: "left",
              colspan: 1,
              rowspan: 1,
            },
            content: [{ type: "text", text: "3-3", styles: {} }],
          },
        ],
      },
    ],
  },
  children: [],
} satisfies Block<
  {
    table: DefaultBlockSchema["table"];
  },
  any,
  any
>;

/**
 *  Normal table
 *  | 1-1 | 1-2 | 1-3 |
 *  | 2-1 | 2-2 | 2-3 |
 *  | 3-1 | 3-2 | 3-3 |
 *
 *  Table with colspans and rowspans
 *  | 1-1 | 1-2 | 1-2 |
 *  | 1-1 | 2-1 | 2-1 |
 *  | 3-1 | 2-1 | 2-1 |
 */
const tableWithColspansAndRowspans = {
  type: "table",
  id: "table-0",
  props: {
    textColor: "default",
  },
  content: {
    type: "tableContent",
    columnWidths: [100, 100],
    rows: [
      {
        cells: [
          {
            type: "tableCell",
            props: {
              backgroundColor: "default",
              textColor: "default",
              textAlignment: "left",
              colspan: 1,
              rowspan: 2,
            },
            content: [
              { type: "text", text: "1-1", styles: {} },
              { type: "text", text: "2-1", styles: {} },
            ],
          },
          {
            type: "tableCell",
            props: {
              backgroundColor: "default",
              textColor: "default",
              textAlignment: "left",
              colspan: 2,
              rowspan: 1,
            },
            content: [
              { type: "text", text: "1-2", styles: {} },
              { type: "text", text: "1-3", styles: {} },
            ],
          },
        ],
      },
      {
        cells: [
          {
            type: "tableCell",
            props: {
              backgroundColor: "default",
              textColor: "default",
              textAlignment: "left",
              colspan: 2,
              rowspan: 2,
            },
            content: [
              { type: "text", text: "2-2", styles: {} },
              { type: "text", text: "2-3", styles: {} },
              { type: "text", text: "3-2", styles: {} },
              { type: "text", text: "3-3", styles: {} },
            ],
          },
        ],
      },
      {
        cells: [
          {
            type: "tableCell",
            props: {
              backgroundColor: "default",
              textColor: "default",
              textAlignment: "left",
              colspan: 1,
              rowspan: 1,
            },
            content: [{ type: "text", text: "3-1", styles: {} }],
          },
        ],
      },
    ],
  },
  children: [],
} satisfies Block<
  {
    table: DefaultBlockSchema["table"];
  },
  any,
  any
>;

/**
 *  Normal table
 *  | 1-1 | 1-2 | 1-3 | 1-4 |
 *  | 2-1 | 2-2 | 2-3 | 2-4 |
 *  | 3-1 | 3-2 | 3-3 | 3-4 |
 *
 *  Table with complex rowspans and colspans
 *  | 1-1 | 1-1 | 1-2 | 1-3 |
 *  | 1-1 | 1-1 | 2-1 | 2-2 |
 *  | 3-1 | 3-2 | 2-1 | 3-3 |
 */
const tableWithComplexRowspansAndColspans = {
  type: "table",
  id: "table-0",
  props: {
    textColor: "default",
  },
  content: {
    type: "tableContent",
    columnWidths: [100, 100],
    rows: [
      {
        cells: [
          {
            type: "tableCell",
            props: {
              backgroundColor: "default",
              textColor: "default",
              textAlignment: "left",
              colspan: 2,
              rowspan: 2,
            },
            content: [
              { type: "text", text: "1-1", styles: {} },
              { type: "text", text: "1-2", styles: {} },
              { type: "text", text: "2-1", styles: {} },
              { type: "text", text: "2-2", styles: {} },
            ],
          },
          {
            type: "tableCell",
            props: {
              backgroundColor: "default",
              textColor: "default",
              textAlignment: "left",
              colspan: 1,
              rowspan: 1,
            },
            content: [{ type: "text", text: "1-3", styles: {} }],
          },
          {
            type: "tableCell",
            props: {
              backgroundColor: "default",
              textColor: "default",
              textAlignment: "left",
              colspan: 1,
              rowspan: 1,
            },
            content: [{ type: "text", text: "1-4", styles: {} }],
          },
        ],
      },
      {
        cells: [
          {
            type: "tableCell",
            props: {
              backgroundColor: "default",
              textColor: "default",
              textAlignment: "left",
              colspan: 1,
              rowspan: 2,
            },
            content: [
              { type: "text", text: "2-3", styles: {} },
              { type: "text", text: "3-3", styles: {} },
            ],
          },
          {
            type: "tableCell",
            props: {
              backgroundColor: "default",
              textColor: "default",
              textAlignment: "left",
              colspan: 1,
              rowspan: 1,
            },
            content: [{ type: "text", text: "2-4", styles: {} }],
          },
        ],
      },
      {
        cells: [
          {
            type: "tableCell",
            props: {
              backgroundColor: "default",
              textColor: "default",
              textAlignment: "left",
              colspan: 1,
              rowspan: 1,
            },
            content: [{ type: "text", text: "3-1", styles: {} }],
          },
          {
            type: "tableCell",
            props: {
              backgroundColor: "default",
              textColor: "default",
              textAlignment: "left",
              colspan: 1,
              rowspan: 1,
            },
            content: [{ type: "text", text: "3-2", styles: {} }],
          },
          {
            type: "tableCell",
            props: {
              backgroundColor: "default",
              textColor: "default",
              textAlignment: "left",
              colspan: 1,
              rowspan: 1,
            },
            content: [{ type: "text", text: "3-3", styles: {} }],
          },
        ],
      },
    ],
  },
  children: [],
} satisfies Block<
  {
    table: DefaultBlockSchema["table"];
  },
  any,
  any
>;

describe("Test getAbsoluteTableCellIndices", () => {
  it("should resolve relative table cell indices to absolute table cell indices", () => {
    expect(getAbsoluteTableCells({ row: 0, col: 0 }, simpleTable)).toEqual({
      row: 0,
      col: 0,
      cell: simpleTable.content.rows[0].cells[0],
    });
    expect(getAbsoluteTableCells({ row: 0, col: 1 }, simpleTable)).toEqual({
      row: 0,
      col: 1,
      cell: simpleTable.content.rows[0].cells[1],
    });
    expect(getAbsoluteTableCells({ row: 1, col: 0 }, simpleTable)).toEqual({
      row: 1,
      col: 0,
      cell: simpleTable.content.rows[1].cells[0],
    });
    expect(getAbsoluteTableCells({ row: 1, col: 1 }, simpleTable)).toEqual({
      row: 1,
      col: 1,
      cell: simpleTable.content.rows[1].cells[1],
    });
  });

  it("should resolve relative table cell indices to absolute table cell indices with colspan", () => {
    expect(getAbsoluteTableCells({ row: 0, col: 0 }, tableWithColspan)).toEqual(
      {
        row: 0,
        col: 0,
        cell: tableWithColspan.content.rows[0].cells[0],
      },
    );
    expect(getAbsoluteTableCells({ row: 0, col: 1 }, tableWithColspan)).toEqual(
      {
        row: 0,
        col: 2,
        cell: tableWithColspan.content.rows[0].cells[1],
      },
    );
    expect(getAbsoluteTableCells({ row: 1, col: 0 }, tableWithColspan)).toEqual(
      {
        row: 1,
        col: 0,
        cell: tableWithColspan.content.rows[1].cells[0],
      },
    );
    expect(getAbsoluteTableCells({ row: 1, col: 1 }, tableWithColspan)).toEqual(
      {
        row: 1,
        col: 1,
        cell: tableWithColspan.content.rows[1].cells[1],
      },
    );
    expect(getAbsoluteTableCells({ row: 1, col: 2 }, tableWithColspan)).toEqual(
      {
        row: 1,
        col: 2,
        cell: tableWithColspan.content.rows[1].cells[2],
      },
    );
  });

  it("should resolve relative table cell indices to absolute table cell indices with rowspan", () => {
    expect(getAbsoluteTableCells({ row: 0, col: 0 }, tableWithRowspan)).toEqual(
      {
        row: 0,
        col: 0,
        cell: tableWithRowspan.content.rows[0].cells[0],
      },
    );
    expect(getAbsoluteTableCells({ row: 0, col: 1 }, tableWithRowspan)).toEqual(
      {
        row: 0,
        col: 1,
        cell: tableWithRowspan.content.rows[0].cells[1],
      },
    );
    expect(getAbsoluteTableCells({ row: 0, col: 2 }, tableWithRowspan)).toEqual(
      {
        row: 0,
        col: 2,
        cell: tableWithRowspan.content.rows[0].cells[2],
      },
    );
    expect(getAbsoluteTableCells({ row: 1, col: 0 }, tableWithRowspan)).toEqual(
      {
        row: 1,
        col: 1,
        cell: tableWithRowspan.content.rows[1].cells[0],
      },
    );
    expect(getAbsoluteTableCells({ row: 1, col: 1 }, tableWithRowspan)).toEqual(
      {
        row: 1,
        col: 2,
        cell: tableWithRowspan.content.rows[1].cells[1],
      },
    );
    expect(getAbsoluteTableCells({ row: 2, col: 0 }, tableWithRowspan)).toEqual(
      {
        row: 2,
        col: 0,
        cell: tableWithRowspan.content.rows[2].cells[0],
      },
    );
    expect(getAbsoluteTableCells({ row: 2, col: 1 }, tableWithRowspan)).toEqual(
      {
        row: 2,
        col: 1,
        cell: tableWithRowspan.content.rows[2].cells[1],
      },
    );
  });

  it("should resolve complex rowspans and colspans", () => {
    expect(
      getAbsoluteTableCells(
        { row: 0, col: 0 },
        tableWithComplexRowspansAndColspans,
      ),
    ).toEqual({
      row: 0,
      col: 0,
      cell: tableWithComplexRowspansAndColspans.content.rows[0].cells[0],
    });
    expect(
      getAbsoluteTableCells(
        { row: 0, col: 1 },
        tableWithComplexRowspansAndColspans,
      ),
    ).toEqual({
      row: 0,
      col: 2,
      cell: tableWithComplexRowspansAndColspans.content.rows[0].cells[1],
    });
    expect(
      getAbsoluteTableCells(
        { row: 0, col: 2 },
        tableWithComplexRowspansAndColspans,
      ),
    ).toEqual({
      row: 0,
      col: 3,
      cell: tableWithComplexRowspansAndColspans.content.rows[0].cells[2],
    });
    expect(
      getAbsoluteTableCells(
        { row: 1, col: 0 },
        tableWithComplexRowspansAndColspans,
      ),
    ).toEqual({
      row: 1,
      col: 2,
      cell: tableWithComplexRowspansAndColspans.content.rows[1].cells[0],
    });
    expect(
      getAbsoluteTableCells(
        { row: 1, col: 1 },
        tableWithComplexRowspansAndColspans,
      ),
    ).toEqual({
      row: 1,
      col: 3,
      cell: tableWithComplexRowspansAndColspans.content.rows[1].cells[1],
    });
    expect(
      getAbsoluteTableCells(
        { row: 2, col: 0 },
        tableWithComplexRowspansAndColspans,
      ),
    ).toEqual({
      row: 2,
      col: 0,
      cell: tableWithComplexRowspansAndColspans.content.rows[2].cells[0],
    });
    expect(
      getAbsoluteTableCells(
        { row: 2, col: 1 },
        tableWithComplexRowspansAndColspans,
      ),
    ).toEqual({
      row: 2,
      col: 1,
      cell: tableWithComplexRowspansAndColspans.content.rows[2].cells[1],
    });
    expect(
      getAbsoluteTableCells(
        { row: 2, col: 2 },
        tableWithComplexRowspansAndColspans,
      ),
    ).toEqual({
      row: 2,
      col: 3,
      cell: tableWithComplexRowspansAndColspans.content.rows[2].cells[2],
    });
  });
});

describe("Test getRelativeTableCellIndices", () => {
  it("should resolve absolute table cell indices to relative table cell indices", () => {
    expect(getRelativeTableCells({ row: 0, col: 0 }, simpleTable)).toEqual({
      row: 0,
      col: 0,
      cell: simpleTable.content.rows[0].cells[0],
    });
    expect(getRelativeTableCells({ row: 0, col: 1 }, simpleTable)).toEqual({
      row: 0,
      col: 1,
      cell: simpleTable.content.rows[0].cells[1],
    });
    expect(getRelativeTableCells({ row: 1, col: 0 }, simpleTable)).toEqual({
      row: 1,
      col: 0,
      cell: simpleTable.content.rows[1].cells[0],
    });
    expect(getRelativeTableCells({ row: 1, col: 1 }, simpleTable)).toEqual({
      row: 1,
      col: 1,
      cell: simpleTable.content.rows[1].cells[1],
    });
  });

  it("should resolve absolute table cell indices to relative table cell indices with colspan", () => {
    expect(getRelativeTableCells({ row: 0, col: 0 }, tableWithColspan)).toEqual(
      {
        row: 0,
        col: 0,
        cell: tableWithColspan.content.rows[0].cells[0],
      },
    );
    expect(getRelativeTableCells({ row: 0, col: 1 }, tableWithColspan)).toEqual(
      {
        row: 0,
        col: 0,
        cell: tableWithColspan.content.rows[0].cells[0],
      },
    );
    expect(getRelativeTableCells({ row: 0, col: 2 }, tableWithColspan)).toEqual(
      {
        row: 0,
        col: 1,
        cell: tableWithColspan.content.rows[0].cells[1],
      },
    );
    expect(getRelativeTableCells({ row: 1, col: 0 }, tableWithColspan)).toEqual(
      {
        row: 1,
        col: 0,
        cell: tableWithColspan.content.rows[1].cells[0],
      },
    );
    expect(getRelativeTableCells({ row: 1, col: 1 }, tableWithColspan)).toEqual(
      {
        row: 1,
        col: 1,
        cell: tableWithColspan.content.rows[1].cells[1],
      },
    );
    expect(getRelativeTableCells({ row: 1, col: 2 }, tableWithColspan)).toEqual(
      {
        row: 1,
        col: 2,
        cell: tableWithColspan.content.rows[1].cells[2],
      },
    );
  });

  it("should resolve absolute table cell indices to relative table cell indices with rowspan", () => {
    expect(getRelativeTableCells({ row: 0, col: 0 }, tableWithRowspan)).toEqual(
      {
        row: 0,
        col: 0,
        cell: tableWithRowspan.content.rows[0].cells[0],
      },
    );
    expect(getRelativeTableCells({ row: 0, col: 1 }, tableWithRowspan)).toEqual(
      {
        row: 0,
        col: 1,
        cell: tableWithRowspan.content.rows[0].cells[1],
      },
    );
    expect(getRelativeTableCells({ row: 0, col: 2 }, tableWithRowspan)).toEqual(
      {
        row: 0,
        col: 2,
        cell: tableWithRowspan.content.rows[0].cells[2],
      },
    );
    expect(getRelativeTableCells({ row: 1, col: 0 }, tableWithRowspan)).toEqual(
      {
        row: 0,
        col: 0,
        cell: tableWithRowspan.content.rows[0].cells[0],
      },
    );
    expect(getRelativeTableCells({ row: 1, col: 1 }, tableWithRowspan)).toEqual(
      {
        row: 1,
        col: 0,
        cell: tableWithRowspan.content.rows[1].cells[0],
      },
    );
    expect(getRelativeTableCells({ row: 1, col: 2 }, tableWithRowspan)).toEqual(
      {
        row: 1,
        col: 1,
        cell: tableWithRowspan.content.rows[1].cells[1],
      },
    );
    expect(getRelativeTableCells({ row: 2, col: 0 }, tableWithRowspan)).toEqual(
      {
        row: 2,
        col: 0,
        cell: tableWithRowspan.content.rows[2].cells[0],
      },
    );
    expect(getRelativeTableCells({ row: 2, col: 1 }, tableWithRowspan)).toEqual(
      {
        row: 2,
        col: 1,
        cell: tableWithRowspan.content.rows[2].cells[1],
      },
    );
    expect(getRelativeTableCells({ row: 2, col: 2 }, tableWithRowspan)).toEqual(
      {
        row: 2,
        col: 2,
        cell: tableWithRowspan.content.rows[2].cells[2],
      },
    );
  });

  it("should resolve absolute table cell indices to relative table cell indices with colspan and rowspan", () => {
    expect(
      getRelativeTableCells({ row: 0, col: 0 }, tableWithColspanAndRowspan),
    ).toEqual({
      row: 0,
      col: 0,
      cell: tableWithColspanAndRowspan.content.rows[0].cells[0],
    });
    expect(
      getRelativeTableCells({ row: 0, col: 1 }, tableWithColspanAndRowspan),
    ).toEqual({
      row: 0,
      col: 1,
      cell: tableWithColspanAndRowspan.content.rows[0].cells[1],
    });
    expect(
      getRelativeTableCells({ row: 0, col: 2 }, tableWithColspanAndRowspan),
    ).toEqual({
      row: 0,
      col: 2,
      cell: tableWithColspanAndRowspan.content.rows[0].cells[2],
    });
    expect(
      getRelativeTableCells({ row: 1, col: 0 }, tableWithColspanAndRowspan),
    ).toEqual({
      row: 0,
      col: 0,
      cell: tableWithColspanAndRowspan.content.rows[0].cells[0],
    });
    expect(
      getRelativeTableCells({ row: 1, col: 1 }, tableWithColspanAndRowspan),
    ).toEqual({
      row: 1,
      col: 0,
      cell: tableWithColspanAndRowspan.content.rows[1].cells[0],
    });
    expect(
      getRelativeTableCells({ row: 1, col: 2 }, tableWithColspanAndRowspan),
    ).toEqual({
      row: 1,
      col: 0,
      cell: tableWithColspanAndRowspan.content.rows[1].cells[0],
    });
    expect(
      getRelativeTableCells({ row: 2, col: 0 }, tableWithColspanAndRowspan),
    ).toEqual({
      row: 2,
      col: 0,
      cell: tableWithColspanAndRowspan.content.rows[2].cells[0],
    });
    expect(
      getRelativeTableCells({ row: 2, col: 1 }, tableWithColspanAndRowspan),
    ).toEqual({
      row: 2,
      col: 1,
      cell: tableWithColspanAndRowspan.content.rows[2].cells[1],
    });
    expect(
      getRelativeTableCells({ row: 2, col: 2 }, tableWithColspanAndRowspan),
    ).toEqual({
      row: 2,
      col: 2,
      cell: tableWithColspanAndRowspan.content.rows[2].cells[2],
    });
  });

  it("should resolve absolute table cell indices to relative table cell indices with colspans and rowspans", () => {
    expect(
      getRelativeTableCells({ row: 0, col: 0 }, tableWithColspansAndRowspans),
    ).toEqual({
      row: 0,
      col: 0,
      cell: tableWithColspansAndRowspans.content.rows[0].cells[0],
    });
    expect(
      getRelativeTableCells({ row: 0, col: 1 }, tableWithColspansAndRowspans),
    ).toEqual({
      row: 0,
      col: 1,
      cell: tableWithColspansAndRowspans.content.rows[0].cells[1],
    });
    expect(
      getRelativeTableCells({ row: 0, col: 2 }, tableWithColspansAndRowspans),
    ).toEqual({
      row: 0,
      col: 1,
      cell: tableWithColspansAndRowspans.content.rows[0].cells[1],
    });
    expect(
      getRelativeTableCells({ row: 1, col: 0 }, tableWithColspansAndRowspans),
    ).toEqual({
      row: 0,
      col: 0,
      cell: tableWithColspansAndRowspans.content.rows[0].cells[0],
    });
    expect(
      getRelativeTableCells({ row: 1, col: 1 }, tableWithColspansAndRowspans),
    ).toEqual({
      row: 1,
      col: 0,
      cell: tableWithColspansAndRowspans.content.rows[1].cells[0],
    });
    expect(
      getRelativeTableCells({ row: 1, col: 2 }, tableWithColspansAndRowspans),
    ).toEqual({
      row: 1,
      col: 0,
      cell: tableWithColspansAndRowspans.content.rows[1].cells[0],
    });
    expect(
      getRelativeTableCells({ row: 2, col: 0 }, tableWithColspansAndRowspans),
    ).toEqual({
      row: 2,
      col: 0,
      cell: tableWithColspansAndRowspans.content.rows[2].cells[0],
    });
    expect(
      getRelativeTableCells({ row: 2, col: 1 }, tableWithColspansAndRowspans),
    ).toEqual({
      row: 1,
      col: 0,
      cell: tableWithColspansAndRowspans.content.rows[1].cells[0],
    });
    expect(
      getRelativeTableCells({ row: 2, col: 2 }, tableWithColspansAndRowspans),
    ).toEqual({
      row: 1,
      col: 0,
      cell: tableWithColspansAndRowspans.content.rows[1].cells[0],
    });
  });
});

describe("resolveAbsoluteTableCellIndices and resolveRelativeTableCellIndices should be inverse functions", () => {
  it("should work for simple tables", () => {
    for (let row = 0; row < simpleTable.content.rows.length; row++) {
      for (
        let col = 0;
        col < simpleTable.content.rows[row].cells.length;
        col++
      ) {
        expect(
          getRelativeTableCells(
            getAbsoluteTableCells({ row, col }, simpleTable),
            simpleTable,
          ),
        ).toEqual({ row, col, cell: simpleTable.content.rows[row].cells[col] });
      }
    }
  });
  it("should work for tables with colspans", () => {
    for (let row = 0; row < tableWithColspan.content.rows.length; row++) {
      for (
        let col = 0;
        col < tableWithColspan.content.rows[row].cells.length;
        col++
      ) {
        expect(
          getRelativeTableCells(
            getAbsoluteTableCells({ row, col }, tableWithColspan),
            tableWithColspan,
          ),
        ).toEqual({
          row,
          col,
          cell: tableWithColspan.content.rows[row].cells[col],
        });
      }
    }
  });

  it("should work for tables with rowspans", () => {
    for (let row = 0; row < tableWithRowspan.content.rows.length; row++) {
      for (
        let col = 0;
        col < tableWithRowspan.content.rows[row].cells.length;
        col++
      ) {
        expect(
          getRelativeTableCells(
            getAbsoluteTableCells({ row, col }, tableWithRowspan),
            tableWithRowspan,
          ),
        ).toEqual({
          row,
          col,
          cell: tableWithRowspan.content.rows[row].cells[col],
        });
      }
    }
  });

  it("should work for tables with colspans and rowspans", () => {
    for (
      let row = 0;
      row < tableWithColspanAndRowspan.content.rows.length;
      row++
    ) {
      for (
        let col = 0;
        col < tableWithColspanAndRowspan.content.rows[row].cells.length;
        col++
      ) {
        expect(
          getRelativeTableCells(
            getAbsoluteTableCells({ row, col }, tableWithColspanAndRowspan),
            tableWithColspanAndRowspan,
          ),
        ).toEqual({
          row,
          col,
          cell: tableWithColspanAndRowspan.content.rows[row].cells[col],
        });
      }
    }
  });

  it("should work for tables with complex rowspans and colspans", () => {
    for (
      let row = 0;
      row < tableWithComplexRowspansAndColspans.content.rows.length;
      row++
    ) {
      for (
        let col = 0;
        col <
        tableWithComplexRowspansAndColspans.content.rows[row].cells.length;
        col++
      ) {
        expect(
          getRelativeTableCells(
            getAbsoluteTableCells(
              { row, col },
              tableWithComplexRowspansAndColspans,
            ),
            tableWithComplexRowspansAndColspans,
          ),
        ).toEqual({
          row,
          col,
          cell: tableWithComplexRowspansAndColspans.content.rows[row].cells[
            col
          ],
        });
      }
    }
  });
});

describe("Test getRow", () => {
  it("should get the row of the table", () => {
    expect(getCellsAtRowHandle(simpleTable, 0)).toEqual(
      simpleTable.content.rows[0].cells.map((cell, col) => ({
        row: 0,
        col,
        cell,
      })),
    );
  });

  it("should get the row of the table with colspan", () => {
    expect(getCellsAtRowHandle(tableWithColspan, 0)).toEqual([
      {
        row: 0,
        col: 0,
        cell: tableWithColspan.content.rows[0].cells[0],
      },
      {
        row: 0,
        col: 1,
        cell: tableWithColspan.content.rows[0].cells[1],
      },
    ]);

    expect(getCellsAtRowHandle(tableWithColspan, 1)).toEqual([
      {
        row: 1,
        col: 0,
        cell: tableWithColspan.content.rows[1].cells[0],
      },
      {
        row: 1,
        col: 1,
        cell: tableWithColspan.content.rows[1].cells[1],
      },
      {
        row: 1,
        col: 2,
        cell: tableWithColspan.content.rows[1].cells[2],
      },
    ]);
  });

  it("should get the row of the table with rowspan", () => {
    expect(getCellsAtRowHandle(tableWithRowspan, 0)).toEqual([
      {
        row: 0,
        col: 0,
        cell: tableWithRowspan.content.rows[0].cells[0],
      },
      {
        row: 0,
        col: 1,
        cell: tableWithRowspan.content.rows[0].cells[1],
      },
      {
        row: 0,
        col: 2,
        cell: tableWithRowspan.content.rows[0].cells[2],
      },
    ]);

    expect(getCellsAtRowHandle(tableWithRowspan, 1)).toEqual([
      {
        row: 2,
        col: 0,
        cell: tableWithRowspan.content.rows[2].cells[0],
      },
      {
        row: 2,
        col: 1,
        cell: tableWithRowspan.content.rows[2].cells[1],
      },
      {
        row: 2,
        col: 2,
        cell: tableWithRowspan.content.rows[2].cells[2],
      },
    ]);
  });

  it("should get the row of the table with complex rowspans and colspans", () => {
    expect(getCellsAtRowHandle(tableWithComplexRowspansAndColspans, 0)).toEqual(
      [
        {
          row: 0,
          col: 0,
          cell: tableWithComplexRowspansAndColspans.content.rows[0].cells[0],
        },
        {
          row: 0,
          col: 1,
          cell: tableWithComplexRowspansAndColspans.content.rows[0].cells[1],
        },
        {
          row: 0,
          col: 2,
          cell: tableWithComplexRowspansAndColspans.content.rows[0].cells[2],
        },
      ],
    );
    expect(getCellsAtRowHandle(tableWithComplexRowspansAndColspans, 1)).toEqual(
      [
        {
          row: 2,
          col: 0,
          cell: tableWithComplexRowspansAndColspans.content.rows[2].cells[0],
        },
        {
          row: 2,
          col: 1,
          cell: tableWithComplexRowspansAndColspans.content.rows[2].cells[1],
        },
        {
          row: 1,
          col: 0,
          cell: tableWithComplexRowspansAndColspans.content.rows[1].cells[0],
        },
        {
          row: 2,
          col: 2,
          cell: tableWithComplexRowspansAndColspans.content.rows[2].cells[2],
        },
      ],
    );
    expect(getCellsAtRowHandle(tableWithComplexRowspansAndColspans, 2)).toEqual(
      [],
    );
  });
});

describe("Test getColumn", () => {
  it("should get the column of the table", () => {
    expect(getCellsAtColumnHandle(simpleTable, 0)).toEqual([
      {
        row: 0,
        col: 0,
        cell: simpleTable.content.rows[0].cells[0],
      },
      {
        row: 1,
        col: 0,
        cell: simpleTable.content.rows[1].cells[0],
      },
    ]);

    expect(getCellsAtColumnHandle(simpleTable, 1)).toEqual([
      {
        row: 0,
        col: 1,
        cell: simpleTable.content.rows[0].cells[1],
      },
      {
        row: 1,
        col: 1,
        cell: simpleTable.content.rows[1].cells[1],
      },
    ]);
    expect(getCellsAtColumnHandle(simpleTable, 2)).toEqual([]);
  });

  it("should get the column of the table with colspan", () => {
    expect(getCellsAtColumnHandle(tableWithColspan, 0)).toEqual([
      {
        row: 0,
        col: 0,
        cell: tableWithColspan.content.rows[0].cells[0],
      },
      {
        row: 1,
        col: 0,
        cell: tableWithColspan.content.rows[1].cells[0],
      },
    ]);

    expect(getCellsAtColumnHandle(tableWithColspan, 1)).toEqual([
      {
        row: 0,
        col: 1,
        cell: tableWithColspan.content.rows[0].cells[1],
      },
      {
        row: 1,
        col: 2,
        cell: tableWithColspan.content.rows[1].cells[2],
      },
    ]);
    expect(getCellsAtColumnHandle(tableWithColspan, 2)).toEqual([]);
  });

  it("should get the column of the table with rowspan", () => {
    expect(getCellsAtColumnHandle(tableWithRowspan, 0)).toEqual([
      {
        row: 0,
        col: 0,
        cell: tableWithRowspan.content.rows[0].cells[0],
      },
      {
        row: 2,
        col: 0,
        cell: tableWithRowspan.content.rows[2].cells[0],
      },
    ]);

    expect(getCellsAtColumnHandle(tableWithRowspan, 1)).toEqual([
      {
        row: 0,
        col: 1,
        cell: tableWithRowspan.content.rows[0].cells[1],
      },
      {
        row: 1,
        col: 0,
        cell: tableWithRowspan.content.rows[1].cells[0],
      },
      {
        row: 2,
        col: 1,
        cell: tableWithRowspan.content.rows[2].cells[1],
      },
    ]);

    expect(getCellsAtColumnHandle(tableWithRowspan, 2)).toEqual([
      {
        row: 0,
        col: 2,
        cell: tableWithRowspan.content.rows[0].cells[2],
      },
      {
        row: 1,
        col: 1,
        cell: tableWithRowspan.content.rows[1].cells[1],
      },
      {
        row: 2,
        col: 2,
        cell: tableWithRowspan.content.rows[2].cells[2],
      },
    ]);
    expect(getCellsAtColumnHandle(tableWithRowspan, 3)).toEqual([]);
  });

  it("should get the column of the table with complex rowspans and colspans", () => {
    expect(
      getCellsAtColumnHandle(tableWithComplexRowspansAndColspans, 0),
    ).toEqual([
      {
        row: 0,
        col: 0,
        cell: tableWithComplexRowspansAndColspans.content.rows[0].cells[0],
      },
      {
        row: 2,
        col: 0,
        cell: tableWithComplexRowspansAndColspans.content.rows[2].cells[0],
      },
    ]);
    expect(
      getCellsAtColumnHandle(tableWithComplexRowspansAndColspans, 1),
    ).toEqual([
      {
        row: 0,
        col: 1,
        cell: tableWithComplexRowspansAndColspans.content.rows[0].cells[1],
      },
      {
        row: 1,
        col: 0,
        cell: tableWithComplexRowspansAndColspans.content.rows[1].cells[0],
      },
    ]);
    expect(
      getCellsAtColumnHandle(tableWithComplexRowspansAndColspans, 2),
    ).toEqual([
      {
        row: 0,
        col: 2,
        cell: tableWithComplexRowspansAndColspans.content.rows[0].cells[2],
      },
      {
        row: 1,
        col: 1,
        cell: tableWithComplexRowspansAndColspans.content.rows[1].cells[1],
      },
      {
        row: 2,
        col: 2,
        cell: tableWithComplexRowspansAndColspans.content.rows[2].cells[2],
      },
    ]);
    expect(
      getCellsAtColumnHandle(tableWithComplexRowspansAndColspans, 3),
    ).toEqual([]);
  });
});

describe("Test moveColumn", () => {
  it("should move the column of the table", () => {
    expect(moveColumn(simpleTable, 0, 1)).toEqual([
      {
        cells: [
          simpleTable.content.rows[0].cells[1],
          simpleTable.content.rows[0].cells[0],
        ],
      },
      {
        cells: [
          simpleTable.content.rows[1].cells[1],
          simpleTable.content.rows[1].cells[0],
        ],
      },
    ]);
  });
});

describe("Test moveRow", () => {
  it("should move the row of the table", () => {
    expect(moveRow(simpleTable, 0, 1)).toEqual([
      {
        cells: [
          simpleTable.content.rows[1].cells[0],
          simpleTable.content.rows[1].cells[1],
        ],
      },
      {
        cells: [
          simpleTable.content.rows[0].cells[0],
          simpleTable.content.rows[0].cells[1],
        ],
      },
    ]);
  });
});

describe("Test cropEmptyRowsOrColumns", () => {
  const emptyCell = {
    type: "tableCell" as const,
    props: {
      backgroundColor: "red",
      textColor: "blue",
      textAlignment: "left" as const,
      colspan: 1,
      rowspan: 1,
    },
    content: [{ type: "text" as const, text: "", styles: {} }],
  };
  it("should crop the empty rows of the table", () => {
    expect(
      cropEmptyRowsOrColumns(
        {
          ...simpleTable,
          content: {
            ...simpleTable.content,
            rows: simpleTable.content.rows.concat([
              {
                cells: [emptyCell, emptyCell],
              },
            ]),
          },
        },
        "rows",
      ),
    ).toEqual([
      {
        cells: [
          simpleTable.content.rows[0].cells[0],
          simpleTable.content.rows[0].cells[1],
        ],
      },
      {
        cells: [
          simpleTable.content.rows[1].cells[0],
          simpleTable.content.rows[1].cells[1],
        ],
      },
    ]);
  });

  it("should crop the empty rows of a table with colspan", () => {
    expect(
      cropEmptyRowsOrColumns(
        {
          ...tableWithColspan,
          content: {
            ...tableWithColspan.content,
            rows: tableWithColspan.content.rows.concat([
              {
                cells: [emptyCell, emptyCell, emptyCell],
              },
            ]),
          },
        },
        "rows",
      ),
    ).toEqual(tableWithColspan.content.rows);
  });

  it("should crop the empty columns of a table with colspan", () => {
    expect(
      cropEmptyRowsOrColumns(
        {
          ...tableWithColspan,
          content: {
            ...tableWithColspan.content,
            rows: [
              {
                cells: [...tableWithColspan.content.rows[0].cells, emptyCell],
              },
              {
                cells: [...tableWithColspan.content.rows[1].cells, emptyCell],
              },
            ],
          },
        },
        "columns",
      ),
    ).toEqual(tableWithColspan.content.rows);
  });

  it("should crop the empty rows of a table with rowspan", () => {
    expect(
      cropEmptyRowsOrColumns(
        {
          ...tableWithRowspan,
          content: {
            ...tableWithRowspan.content,
            rows: tableWithRowspan.content.rows.concat([
              {
                cells: [emptyCell, emptyCell, emptyCell],
              },
            ]),
          },
        },
        "rows",
      ),
    ).toEqual(tableWithRowspan.content.rows);
  });

  it("should crop the empty columns of a table with rowspan", () => {
    expect(
      cropEmptyRowsOrColumns(
        {
          ...tableWithRowspan,
          content: {
            ...tableWithRowspan.content,
            rows: [
              {
                cells: [...tableWithRowspan.content.rows[0].cells, emptyCell],
              },
              {
                cells: [...tableWithRowspan.content.rows[1].cells, emptyCell],
              },
              {
                cells: [...tableWithRowspan.content.rows[2].cells, emptyCell],
              },
            ],
          },
        },
        "columns",
      ),
    ).toEqual(tableWithRowspan.content.rows);
  });

  it("should crop the empty rows of a table with colspan and rowspan", () => {
    expect(
      cropEmptyRowsOrColumns(
        {
          ...tableWithColspanAndRowspan,
          content: {
            ...tableWithColspanAndRowspan.content,
            rows: tableWithColspanAndRowspan.content.rows.concat([
              {
                cells: [emptyCell, emptyCell, emptyCell],
              },
            ]),
          },
        },
        "rows",
      ),
    ).toEqual(tableWithColspanAndRowspan.content.rows);
  });

  it("should crop the empty columns of a table with colspan and rowspan", () => {
    expect(
      cropEmptyRowsOrColumns(
        {
          ...tableWithColspanAndRowspan,
          content: {
            ...tableWithColspanAndRowspan.content,
            rows: [
              {
                cells: [
                  ...tableWithColspanAndRowspan.content.rows[0].cells,
                  emptyCell,
                ],
              },
              {
                cells: [
                  ...tableWithColspanAndRowspan.content.rows[1].cells,
                  emptyCell,
                ],
              },
              {
                cells: [
                  ...tableWithColspanAndRowspan.content.rows[2].cells,
                  emptyCell,
                ],
              },
            ],
          },
        },
        "columns",
      ),
    ).toEqual(tableWithColspanAndRowspan.content.rows);
  });

  it("should crop the empty rows of a table with complex rowspans and colspans", () => {
    expect(
      cropEmptyRowsOrColumns(
        {
          ...tableWithComplexRowspansAndColspans,
          content: {
            ...tableWithComplexRowspansAndColspans.content,
            rows: tableWithComplexRowspansAndColspans.content.rows.concat([
              {
                cells: [emptyCell, emptyCell, emptyCell, emptyCell],
              },
            ]),
          },
        },
        "rows",
      ),
    ).toEqual(tableWithComplexRowspansAndColspans.content.rows);
  });

  it("should crop the empty columns of a table with complex rowspans and colspans", () => {
    expect(
      cropEmptyRowsOrColumns(
        {
          ...tableWithComplexRowspansAndColspans,
          content: {
            ...tableWithComplexRowspansAndColspans.content,
            rows: [
              {
                cells: [
                  ...tableWithComplexRowspansAndColspans.content.rows[0].cells,
                  emptyCell,
                ],
              },
              {
                cells: [
                  ...tableWithComplexRowspansAndColspans.content.rows[1].cells,
                  emptyCell,
                ],
              },
              {
                cells: [
                  ...tableWithComplexRowspansAndColspans.content.rows[2].cells,
                  emptyCell,
                ],
              },
            ],
          },
        },
        "columns",
      ),
    ).toEqual(tableWithComplexRowspansAndColspans.content.rows);
  });

  it("should not crop out the last row of a table", () => {
    expect(
      cropEmptyRowsOrColumns(
        {
          ...simpleTable,
          content: {
            ...simpleTable.content,
            rows: [
              {
                cells: [emptyCell, emptyCell],
              },
              {
                cells: [emptyCell, emptyCell],
              },
            ],
          },
        },
        "rows",
      ),
    ).toEqual([
      {
        cells: [emptyCell, emptyCell],
      },
    ]);
  });

  it("should not crop out the last column of a table", () => {
    expect(
      cropEmptyRowsOrColumns(
        {
          ...simpleTable,
          content: {
            ...simpleTable.content,
            rows: [
              {
                cells: [emptyCell, emptyCell],
              },
              {
                cells: [emptyCell, emptyCell],
              },
            ],
          },
        },
        "columns",
      ),
    ).toEqual([
      {
        cells: [emptyCell],
      },
      {
        cells: [emptyCell],
      },
    ]);
  });

  it("should preserve any colspan or rowspan on that last row", () => {
    expect(
      cropEmptyRowsOrColumns(
        {
          ...simpleTable,
          content: {
            ...simpleTable.content,
            rows: [
              {
                cells: [
                  {
                    ...emptyCell,
                    props: {
                      ...emptyCell.props,
                      rowspan: 2,
                    },
                  },
                  emptyCell,
                ],
              },
              {
                cells: [emptyCell],
              },
            ],
          },
        },
        "rows",
      ),
    ).toEqual([
      {
        cells: [
          {
            ...emptyCell,
            props: {
              ...emptyCell.props,
              rowspan: 2,
            },
          },
          emptyCell,
        ],
      },
      {
        cells: [emptyCell],
      },
    ]);
  });

  it("should preserve any colspan or rowspan on that last column", () => {
    expect(
      cropEmptyRowsOrColumns(
        {
          ...simpleTable,
          content: {
            ...simpleTable.content,
            rows: [
              {
                cells: [
                  {
                    ...emptyCell,
                    props: {
                      ...emptyCell.props,
                      colspan: 2,
                    },
                  },
                ],
              },
              {
                cells: [emptyCell, emptyCell],
              },
            ],
          },
        },
        "columns",
      ),
    ).toEqual([
      {
        cells: [
          {
            ...emptyCell,
            props: {
              ...emptyCell.props,
              colspan: 2,
            },
          },
        ],
      },
      {
        cells: [emptyCell, emptyCell],
      },
    ]);
  });
});
