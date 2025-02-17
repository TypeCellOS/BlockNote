import { describe, expect, it } from "vitest";

import { Block, DefaultBlockSchema } from "../../../blocks/defaultBlocks.js";
import {
  getColumn,
  getRow,
  resolveAbsoluteTableCellIndices,
  resolveRelativeTableCellIndices,
} from "./tables.js";

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

describe("Test resolveRelativeTableCellIndices", () => {
  it("should resolve relative table cell indices to absolute table cell indices", () => {
    expect(
      resolveRelativeTableCellIndices({ row: 0, col: 0 }, simpleTable)
    ).toEqual({ row: 0, col: 0 });
    expect(
      resolveRelativeTableCellIndices({ row: 0, col: 1 }, simpleTable)
    ).toEqual({ row: 0, col: 1 });
    expect(
      resolveRelativeTableCellIndices({ row: 1, col: 0 }, simpleTable)
    ).toEqual({ row: 1, col: 0 });
    expect(
      resolveRelativeTableCellIndices({ row: 1, col: 1 }, simpleTable)
    ).toEqual({ row: 1, col: 1 });
  });

  it("should resolve relative table cell indices to absolute table cell indices with colspan", () => {
    expect(
      resolveRelativeTableCellIndices({ row: 0, col: 0 }, tableWithColspan)
    ).toEqual({ row: 0, col: 0 });
    expect(
      resolveRelativeTableCellIndices({ row: 0, col: 1 }, tableWithColspan)
    ).toEqual({ row: 0, col: 2 });
    expect(
      resolveRelativeTableCellIndices({ row: 1, col: 0 }, tableWithColspan)
    ).toEqual({ row: 1, col: 0 });
    expect(
      resolveRelativeTableCellIndices({ row: 1, col: 1 }, tableWithColspan)
    ).toEqual({ row: 1, col: 1 });
    expect(
      resolveRelativeTableCellIndices({ row: 1, col: 2 }, tableWithColspan)
    ).toEqual({ row: 1, col: 2 });
  });

  it("should resolve relative table cell indices to absolute table cell indices with rowspan", () => {
    expect(
      resolveRelativeTableCellIndices({ row: 0, col: 0 }, tableWithRowspan)
    ).toEqual({ row: 0, col: 0 });
    expect(
      resolveRelativeTableCellIndices({ row: 0, col: 1 }, tableWithRowspan)
    ).toEqual({ row: 0, col: 1 });
    expect(
      resolveRelativeTableCellIndices({ row: 0, col: 2 }, tableWithRowspan)
    ).toEqual({ row: 0, col: 2 });
    expect(
      resolveRelativeTableCellIndices({ row: 1, col: 0 }, tableWithRowspan)
    ).toEqual({ row: 2, col: 0 });
    expect(
      resolveRelativeTableCellIndices({ row: 1, col: 1 }, tableWithRowspan)
    ).toEqual({ row: 1, col: 1 });
    expect(
      resolveRelativeTableCellIndices({ row: 1, col: 2 }, tableWithRowspan)
    ).toEqual({ row: 1, col: 2 });
    expect(
      resolveRelativeTableCellIndices({ row: 2, col: 1 }, tableWithRowspan)
    ).toEqual({ row: 2, col: 1 });
    expect(
      resolveRelativeTableCellIndices({ row: 2, col: 2 }, tableWithRowspan)
    ).toEqual({ row: 2, col: 2 });
  });
});

describe("Test resolveAbsoluteTableCellIndices", () => {
  it("should resolve absolute table cell indices to relative table cell indices", () => {
    expect(
      resolveAbsoluteTableCellIndices({ row: 0, col: 0 }, simpleTable)
    ).toEqual({ row: 0, col: 0, cell: simpleTable.content.rows[0].cells[0] });
    expect(
      resolveAbsoluteTableCellIndices({ row: 0, col: 1 }, simpleTable)
    ).toEqual({ row: 0, col: 1, cell: simpleTable.content.rows[0].cells[1] });
    expect(
      resolveAbsoluteTableCellIndices({ row: 1, col: 0 }, simpleTable)
    ).toEqual({ row: 1, col: 0, cell: simpleTable.content.rows[1].cells[0] });
    expect(
      resolveAbsoluteTableCellIndices({ row: 1, col: 1 }, simpleTable)
    ).toEqual({ row: 1, col: 1, cell: simpleTable.content.rows[1].cells[1] });
  });

  it("should resolve absolute table cell indices to relative table cell indices with colspan", () => {
    expect(
      resolveAbsoluteTableCellIndices({ row: 0, col: 0 }, tableWithColspan)
    ).toEqual({
      row: 0,
      col: 0,
      cell: tableWithColspan.content.rows[0].cells[0],
    });
    expect(
      resolveAbsoluteTableCellIndices({ row: 0, col: 1 }, tableWithColspan)
    ).toEqual({
      row: 0,
      col: 0,
      cell: tableWithColspan.content.rows[0].cells[0],
    });
    expect(
      resolveAbsoluteTableCellIndices({ row: 0, col: 2 }, tableWithColspan)
    ).toEqual({
      row: 0,
      col: 1,
      cell: tableWithColspan.content.rows[0].cells[1],
    });
    expect(
      resolveAbsoluteTableCellIndices({ row: 1, col: 0 }, tableWithColspan)
    ).toEqual({
      row: 1,
      col: 0,
      cell: tableWithColspan.content.rows[1].cells[0],
    });
    expect(
      resolveAbsoluteTableCellIndices({ row: 1, col: 1 }, tableWithColspan)
    ).toEqual({
      row: 1,
      col: 1,
      cell: tableWithColspan.content.rows[1].cells[1],
    });
    expect(
      resolveAbsoluteTableCellIndices({ row: 1, col: 2 }, tableWithColspan)
    ).toEqual({
      row: 1,
      col: 2,
      cell: tableWithColspan.content.rows[1].cells[2],
    });
  });

  it("should resolve absolute table cell indices to relative table cell indices with rowspan", () => {
    expect(
      resolveAbsoluteTableCellIndices({ row: 0, col: 0 }, tableWithRowspan)
    ).toEqual({
      row: 0,
      col: 0,
      cell: tableWithRowspan.content.rows[0].cells[0],
    });
    expect(
      resolveAbsoluteTableCellIndices({ row: 0, col: 1 }, tableWithRowspan)
    ).toEqual({
      row: 0,
      col: 1,
      cell: tableWithRowspan.content.rows[0].cells[1],
    });
    expect(
      resolveAbsoluteTableCellIndices({ row: 0, col: 2 }, tableWithRowspan)
    ).toEqual({
      row: 0,
      col: 2,
      cell: tableWithRowspan.content.rows[0].cells[2],
    });
    expect(
      resolveAbsoluteTableCellIndices({ row: 1, col: 0 }, tableWithRowspan)
    ).toEqual({
      row: 0,
      col: 0,
      cell: tableWithRowspan.content.rows[0].cells[0],
    });
    expect(
      resolveAbsoluteTableCellIndices({ row: 1, col: 1 }, tableWithRowspan)
    ).toEqual({
      row: 1,
      col: 0,
      cell: tableWithRowspan.content.rows[1].cells[0],
    });
    expect(
      resolveAbsoluteTableCellIndices({ row: 1, col: 2 }, tableWithRowspan)
    ).toEqual({
      row: 1,
      col: 1,
      cell: tableWithRowspan.content.rows[1].cells[1],
    });
    expect(
      resolveAbsoluteTableCellIndices({ row: 2, col: 0 }, tableWithRowspan)
    ).toEqual({
      row: 2,
      col: 0,
      cell: tableWithRowspan.content.rows[2].cells[0],
    });
    expect(
      resolveAbsoluteTableCellIndices({ row: 2, col: 1 }, tableWithRowspan)
    ).toEqual({
      row: 2,
      col: 1,
      cell: tableWithRowspan.content.rows[2].cells[1],
    });
    expect(
      resolveAbsoluteTableCellIndices({ row: 2, col: 2 }, tableWithRowspan)
    ).toEqual({
      row: 2,
      col: 2,
      cell: tableWithRowspan.content.rows[2].cells[2],
    });
  });

  it("should resolve absolute table cell indices to relative table cell indices with colspan and rowspan", () => {
    expect(
      resolveAbsoluteTableCellIndices(
        { row: 0, col: 0 },
        tableWithColspanAndRowspan
      )
    ).toEqual({
      row: 0,
      col: 0,
      cell: tableWithColspanAndRowspan.content.rows[0].cells[0],
    });
    expect(
      resolveAbsoluteTableCellIndices(
        { row: 0, col: 1 },
        tableWithColspanAndRowspan
      )
    ).toEqual({
      row: 0,
      col: 1,
      cell: tableWithColspanAndRowspan.content.rows[0].cells[1],
    });
    expect(
      resolveAbsoluteTableCellIndices(
        { row: 0, col: 2 },
        tableWithColspanAndRowspan
      )
    ).toEqual({
      row: 0,
      col: 2,
      cell: tableWithColspanAndRowspan.content.rows[0].cells[2],
    });
    expect(
      resolveAbsoluteTableCellIndices(
        { row: 1, col: 0 },
        tableWithColspanAndRowspan
      )
    ).toEqual({
      row: 0,
      col: 0,
      cell: tableWithColspanAndRowspan.content.rows[0].cells[0],
    });
    expect(
      resolveAbsoluteTableCellIndices(
        { row: 1, col: 1 },
        tableWithColspanAndRowspan
      )
    ).toEqual({
      row: 1,
      col: 0,
      cell: tableWithColspanAndRowspan.content.rows[1].cells[0],
    });
    expect(
      resolveAbsoluteTableCellIndices(
        { row: 1, col: 2 },
        tableWithColspanAndRowspan
      )
    ).toEqual({
      row: 1,
      col: 0,
      cell: tableWithColspanAndRowspan.content.rows[1].cells[0],
    });
    expect(
      resolveAbsoluteTableCellIndices(
        { row: 2, col: 0 },
        tableWithColspanAndRowspan
      )
    ).toEqual({
      row: 2,
      col: 0,
      cell: tableWithColspanAndRowspan.content.rows[2].cells[0],
    });
    expect(
      resolveAbsoluteTableCellIndices(
        { row: 2, col: 1 },
        tableWithColspanAndRowspan
      )
    ).toEqual({
      row: 2,
      col: 1,
      cell: tableWithColspanAndRowspan.content.rows[2].cells[1],
    });
    expect(
      resolveAbsoluteTableCellIndices(
        { row: 2, col: 2 },
        tableWithColspanAndRowspan
      )
    ).toEqual({
      row: 2,
      col: 2,
      cell: tableWithColspanAndRowspan.content.rows[2].cells[2],
    });
  });

  it("should resolve absolute table cell indices to relative table cell indices with colspans and rowspans", () => {
    expect(
      resolveAbsoluteTableCellIndices(
        { row: 0, col: 0 },
        tableWithColspansAndRowspans
      )
    ).toEqual({
      row: 0,
      col: 0,
      cell: tableWithColspansAndRowspans.content.rows[0].cells[0],
    });
    expect(
      resolveAbsoluteTableCellIndices(
        { row: 0, col: 1 },
        tableWithColspansAndRowspans
      )
    ).toEqual({
      row: 0,
      col: 1,
      cell: tableWithColspansAndRowspans.content.rows[0].cells[1],
    });
    expect(
      resolveAbsoluteTableCellIndices(
        { row: 0, col: 2 },
        tableWithColspansAndRowspans
      )
    ).toEqual({
      row: 0,
      col: 1,
      cell: tableWithColspansAndRowspans.content.rows[0].cells[1],
    });
    expect(
      resolveAbsoluteTableCellIndices(
        { row: 1, col: 0 },
        tableWithColspansAndRowspans
      )
    ).toEqual({
      row: 0,
      col: 0,
      cell: tableWithColspansAndRowspans.content.rows[0].cells[0],
    });
    expect(
      resolveAbsoluteTableCellIndices(
        { row: 1, col: 1 },
        tableWithColspansAndRowspans
      )
    ).toEqual({
      row: 1,
      col: 0,
      cell: tableWithColspansAndRowspans.content.rows[1].cells[0],
    });
    expect(
      resolveAbsoluteTableCellIndices(
        { row: 1, col: 2 },
        tableWithColspansAndRowspans
      )
    ).toEqual({
      row: 1,
      col: 0,
      cell: tableWithColspansAndRowspans.content.rows[1].cells[0],
    });
    expect(
      resolveAbsoluteTableCellIndices(
        { row: 2, col: 0 },
        tableWithColspansAndRowspans
      )
    ).toEqual({
      row: 2,
      col: 0,
      cell: tableWithColspansAndRowspans.content.rows[2].cells[0],
    });
    expect(
      resolveAbsoluteTableCellIndices(
        { row: 2, col: 1 },
        tableWithColspansAndRowspans
      )
    ).toEqual({
      row: 1,
      col: 0,
      cell: tableWithColspansAndRowspans.content.rows[1].cells[0],
    });
    expect(
      resolveAbsoluteTableCellIndices(
        { row: 2, col: 2 },
        tableWithColspansAndRowspans
      )
    ).toEqual({
      row: 1,
      col: 0,
      cell: tableWithColspansAndRowspans.content.rows[1].cells[0],
    });
  });
});

describe("Test getRow", () => {
  it("should get the row of the table", () => {
    expect(getRow(simpleTable, 0)).toEqual(
      simpleTable.content.rows[0].cells.map((cell, col) => ({
        row: 0,
        col,
        cell,
      }))
    );
  });

  it("should get the row of the table with colspan", () => {
    expect(getRow(tableWithColspan, 0)).toEqual([
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

    expect(getRow(tableWithColspan, 1)).toEqual([
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
    expect(getRow(tableWithRowspan, 0)).toEqual([
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

    expect(getRow(tableWithRowspan, 1)).toEqual([
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
});

describe("Test getColumn", () => {
  it("should get the column of the table", () => {
    expect(getColumn(simpleTable, 0)).toEqual([
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

    expect(getColumn(simpleTable, 1)).toEqual([
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
  });

  it("should get the column of the table with colspan", () => {
    expect(getColumn(tableWithColspan, 0)).toEqual([
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

    expect(getColumn(tableWithColspan, 1)).toEqual([
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
  });

  it("should get the column of the table with rowspan", () => {
    expect(getColumn(tableWithRowspan, 0)).toEqual([
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

    expect(getColumn(tableWithRowspan, 1)).toEqual([
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

    expect(getColumn(tableWithRowspan, 2)).toEqual([
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
  });
});
