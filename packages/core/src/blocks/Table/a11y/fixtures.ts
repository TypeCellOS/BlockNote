import type { PartialBlock } from "@blocknote/core";

export const mergedTableDocument: PartialBlock[] = [
  {
    id: "merged-table",
    type: "table",
    content: {
      type: "tableContent",
      headerRows: 1,
      headerCols: 1,
      rows: [
        { cells: ["Region", "Apples", "Pears"] },
        {
          cells: [
            { type: "tableCell", content: ["North"] },
            {
              type: "tableCell",
              props: { colspan: 2, rowspan: 2 },
              content: ["Combined total"],
            },
          ],
        },
        // The merged data cell covers this row's remaining columns, leaving
        // South as its only DOM cell. It must still be a row header.
        { cells: ["South"] },
      ],
    },
  },
];
