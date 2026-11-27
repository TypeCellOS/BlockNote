import type { KitchenSinkBlock } from "../schema.js";

export const tables: KitchenSinkBlock[] = [
  {
    type: "paragraph",
    content: "Row and column headers with cell colors",
  },
  {
    type: "table",
    content: {
      type: "tableContent",
      headerRows: 1,
      headerCols: 1,
      columnWidths: [160, 220, 180],
      rows: [
        {
          cells: ["Team", "Project", "Status"],
        },
        {
          cells: [
            {
              type: "tableCell",
              content: ["Design"],
            },
            {
              type: "tableCell",
              props: {
                backgroundColor: "yellow",
                textColor: "blue",
                textAlignment: "center",
              },
              content: ["Website redesign"],
            },
            {
              type: "tableCell",
              content: ["Review"],
            },
          ],
        },
        {
          cells: ["Engineering", "Editor", "Ready"],
        },
      ],
    },
  },
  {
    type: "paragraph",
    content: "Merged columns",
  },
  {
    type: "table",
    content: {
      type: "tableContent",
      headerRows: 1,
      rows: [
        {
          cells: [
            {
              type: "tableCell",
              props: {
                colspan: 2,
                backgroundColor: "blue",
              },
              content: ["Combined header"],
            },
            {
              type: "tableCell",
              content: ["Third column"],
            },
          ],
        },
        {
          cells: ["A", "B", "C"],
        },
        {
          cells: ["D", "E", "F"],
        },
      ],
    },
  },
  {
    type: "paragraph",
    content: "Merged rows and columns",
  },
  {
    type: "table",
    content: {
      type: "tableContent",
      rows: [
        {
          cells: [
            {
              type: "tableCell",
              props: {
                rowspan: 2,
                colspan: 2,
                backgroundColor: "purple",
                textColor: "yellow",
                textAlignment: "right",
              },
              content: ["Two rows × two columns"],
            },
            {
              type: "tableCell",
              content: ["Top right"],
            },
          ],
        },
        {
          cells: ["Bottom right"],
        },
        {
          cells: ["A", "B", "C"],
        },
      ],
    },
  },
];
