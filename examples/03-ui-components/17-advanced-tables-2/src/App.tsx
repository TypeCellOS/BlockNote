import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import type { Block, DefaultBlockSchema } from "@blocknote/core";
import { useRef } from "react";

export default function App() {
  const applying = useRef(false);

  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    // This enables the advanced table features
    tables: {
      splitCells: true,
      cellBackgroundColor: true,
      cellTextColor: true,
      headers: true,
    },
    initialContent: [
      {
        id: "7e498b3d-d42e-4ade-9be0-054b292715ea",
        type: "heading",
        props: {
          textColor: "default",
          backgroundColor: "default",
          textAlignment: "left",
          level: 2,
        },
        content: [
          {
            type: "text",
            text: "Advanced Tables with Calculated Columns",
            styles: {},
          },
        ],
        children: [],
      },
      {
        id: "cbf287c6-770b-413a-bff5-ad490a0b562a",
        type: "table",
        props: {
          textColor: "default",
        },
        content: {
          type: "tableContent",
          columnWidths: [150, 120, 120, 120],
          headerRows: 1,
          rows: [
            {
              cells: [
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "text",
                      text: "Item",
                      styles: { bold: true },
                    },
                  ],
                  props: {
                    colspan: 1,
                    rowspan: 1,
                    backgroundColor: "gray",
                    textColor: "default",
                    textAlignment: "center",
                  },
                },
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "text",
                      text: "Quantity",
                      styles: { bold: true },
                    },
                  ],
                  props: {
                    colspan: 1,
                    rowspan: 1,
                    backgroundColor: "gray",
                    textColor: "default",
                    textAlignment: "center",
                  },
                },
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "text",
                      text: "Price ($)",
                      styles: { bold: true },
                    },
                  ],
                  props: {
                    colspan: 1,
                    rowspan: 1,
                    backgroundColor: "gray",
                    textColor: "default",
                    textAlignment: "center",
                  },
                },
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "text",
                      text: "Total ($)",
                      styles: { bold: true },
                    },
                  ],
                  props: {
                    colspan: 1,
                    rowspan: 1,
                    backgroundColor: "blue",
                    textColor: "white",
                    textAlignment: "center",
                  },
                },
              ],
            },
            {
              cells: [
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "text",
                      text: "Laptop",
                      styles: {},
                    },
                  ],
                  props: {
                    colspan: 1,
                    rowspan: 1,
                    backgroundColor: "default",
                    textColor: "default",
                    textAlignment: "left",
                  },
                },
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "text",
                      text: "2",
                      styles: {},
                    },
                  ],
                  props: {
                    colspan: 1,
                    rowspan: 1,
                    backgroundColor: "default",
                    textColor: "default",
                    textAlignment: "center",
                  },
                },
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "text",
                      text: "1200",
                      styles: {},
                    },
                  ],
                  props: {
                    colspan: 1,
                    rowspan: 1,
                    backgroundColor: "default",
                    textColor: "default",
                    textAlignment: "center",
                  },
                },
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "text",
                      text: "2400",
                      styles: { bold: true },
                    },
                  ],
                  props: {
                    colspan: 1,
                    rowspan: 1,
                    backgroundColor: "green",
                    textColor: "white",
                    textAlignment: "center",
                  },
                },
              ],
            },
            {
              cells: [
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "text",
                      text: "Mouse",
                      styles: {},
                    },
                  ],
                  props: {
                    colspan: 1,
                    rowspan: 1,
                    backgroundColor: "default",
                    textColor: "default",
                    textAlignment: "left",
                  },
                },
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "text",
                      text: "5",
                      styles: {},
                    },
                  ],
                  props: {
                    colspan: 1,
                    rowspan: 1,
                    backgroundColor: "default",
                    textColor: "default",
                    textAlignment: "center",
                  },
                },
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "text",
                      text: "25",
                      styles: {},
                    },
                  ],
                  props: {
                    colspan: 1,
                    rowspan: 1,
                    backgroundColor: "default",
                    textColor: "default",
                    textAlignment: "center",
                  },
                },
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "text",
                      text: "125",
                      styles: { bold: true },
                    },
                  ],
                  props: {
                    colspan: 1,
                    rowspan: 1,
                    backgroundColor: "green",
                    textColor: "white",
                    textAlignment: "center",
                  },
                },
              ],
            },
            {
              cells: [
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "text",
                      text: "Keyboard",
                      styles: {},
                    },
                  ],
                  props: {
                    colspan: 1,
                    rowspan: 1,
                    backgroundColor: "default",
                    textColor: "default",
                    textAlignment: "left",
                  },
                },
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "text",
                      text: "3",
                      styles: {},
                    },
                  ],
                  props: {
                    colspan: 1,
                    rowspan: 1,
                    backgroundColor: "default",
                    textColor: "default",
                    textAlignment: "center",
                  },
                },
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "text",
                      text: "80",
                      styles: {},
                    },
                  ],
                  props: {
                    colspan: 1,
                    rowspan: 1,
                    backgroundColor: "default",
                    textColor: "default",
                    textAlignment: "center",
                  },
                },
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "text",
                      text: "240",
                      styles: { bold: true },
                    },
                  ],
                  props: {
                    colspan: 1,
                    rowspan: 1,
                    backgroundColor: "green",
                    textColor: "white",
                    textAlignment: "center",
                  },
                },
              ],
            },
            {
              cells: [
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "text",
                      text: "Grand Total",
                      styles: { bold: true },
                    },
                  ],
                  props: {
                    colspan: 1,
                    rowspan: 1,
                    backgroundColor: "yellow",
                    textColor: "default",
                    textAlignment: "center",
                  },
                },
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "text",
                      text: "",
                      styles: {},
                    },
                  ],
                  props: {
                    colspan: 1,
                    rowspan: 1,
                    backgroundColor: "yellow",
                    textColor: "default",
                    textAlignment: "center",
                  },
                },
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "text",
                      text: "",
                      styles: {},
                    },
                  ],
                  props: {
                    colspan: 1,
                    rowspan: 1,
                    backgroundColor: "yellow",
                    textColor: "default",
                    textAlignment: "center",
                  },
                },
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "text",
                      text: "2765",
                      styles: { bold: true },
                    },
                  ],
                  props: {
                    colspan: 1,
                    rowspan: 1,
                    backgroundColor: "red",
                    textColor: "white",
                    textAlignment: "center",
                  },
                },
              ],
            },
          ],
        },
        children: [],
      },
      {
        id: "16e76a94-74e5-42e2-b461-fc9da9f381f7",
        type: "paragraph",
        props: {
          textColor: "default",
          backgroundColor: "default",
          textAlignment: "left",
        },
        content: [
          {
            type: "text",
            text: "Features:",
            styles: {},
          },
        ],
        children: [
          {
            id: "785fc9f7-8554-47f4-a4df-8fe2f1438cac",
            type: "bulletListItem",
            props: {
              textColor: "default",
              backgroundColor: "default",
              textAlignment: "left",
            },
            content: [
              {
                type: "text",
                text: "Automatic calculation of totals (Quantity × Price)",
                styles: {},
              },
            ],
            children: [],
          },
          {
            id: "1d0adf08-1b42-421a-b9ea-b3125dcc96d9",
            type: "bulletListItem",
            props: {
              textColor: "default",
              backgroundColor: "default",
              textAlignment: "left",
            },
            content: [
              {
                type: "text",
                text: "Grand total calculation",
                styles: {},
              },
            ],
            children: [],
          },
          {
            id: "99991aa7-9d86-4d06-9073-b1a9c0329062",
            type: "bulletListItem",
            props: {
              textColor: "default",
              backgroundColor: "default",
              textAlignment: "left",
            },
            content: [
              {
                type: "text",
                text: "Cell background & foreground coloring",
                styles: {},
              },
            ],
            children: [],
          },
          {
            id: "c7bf2a7c-8972-44f1-acd8-cf60fa734068",
            type: "bulletListItem",
            props: {
              textColor: "default",
              backgroundColor: "default",
              textAlignment: "left",
            },
            content: [
              {
                type: "text",
                text: "Splitting & merging cells",
                styles: {},
              },
            ],
            children: [],
          },
          {
            id: "785fc9f7-8554-47f4-a4df-8fe2f1438cac",
            type: "bulletListItem",
            props: {
              textColor: "default",
              backgroundColor: "default",
              textAlignment: "left",
            },
            content: [
              {
                type: "text",
                text: "Header rows & columns",
                styles: {},
              },
            ],
            children: [],
          },
        ],
      },
      {
        id: "c7bf2a7c-8972-44f1-acd8-cf60fa734068",
        type: "paragraph",
        props: {
          textColor: "default",
          backgroundColor: "default",
          textAlignment: "left",
        },
        content: [],
        children: [],
      },
    ],
  });

  // Function to calculate totals for a table
  const calculateTableTotals = (tableBlock: Block<DefaultBlockSchema>) => {
    if (tableBlock.type !== "table") return;

    const rows = tableBlock.content.rows;
    if (rows.length < 2) return; // Need at least header + 1 data row

    let grandTotal = 0;
    const updatedRows = rows.map((row, rowIndex: number) => {
      if (rowIndex === 0) return row; // Skip header row
      if (rowIndex === rows.length - 1) return row; // Skip grand total row

      // Helper function to extract text from a cell
      const getCellText = (cell: any): string => {
        if (typeof cell === "string") return cell;
        if (cell && typeof cell === "object" && "content" in cell) {
          return cell.content?.[0]?.text || "0";
        }
        return "0";
      };

      const itemText = getCellText(row.cells[0]);
      const quantityText = getCellText(row.cells[1]);
      const priceText = getCellText(row.cells[2]);

      const quantity = parseFloat(quantityText) || 0;
      const price = parseFloat(priceText) || 0;
      const total = quantity * price;

      grandTotal += total;

      // Update the total cell
      const updatedCells = [...row.cells];
      updatedCells[3] = {
        type: "tableCell",
        content: [
          {
            type: "text",
            text: total.toString(),
            styles: { bold: true },
          },
        ],
        props: {
          colspan: 1,
          rowspan: 1,
          backgroundColor: "green",
          textColor: "white",
          textAlignment: "center",
        },
      };

      // Update item label if total is above 4k
      const baseItemText = itemText.replace(" (eligible for discount)", "");
      if (total >= 4000) {
        updatedCells[0] = {
          ...row.cells[0],
          content: [
            {
              type: "text",
              text: baseItemText + " (eligible for discount)",
              styles: {},
            },
          ],
        };
      } else {
        updatedCells[0] = {
          ...row.cells[0],
          content: [
            {
              type: "text",
              text: baseItemText,
              styles: {},
            },
          ],
        };
      }

      return {
        ...row,
        cells: updatedCells,
      };
    });

    // Update grand total row
    const grandTotalRow = updatedRows[rows.length - 1];
    if (grandTotalRow) {
      const updatedGrandTotalCells = [...grandTotalRow.cells];
      updatedGrandTotalCells[3] = {
        type: "tableCell",
        content: [
          {
            type: "text",
            text: grandTotal.toString(),
            styles: { bold: true },
          },
        ],
        props: {
          colspan: 1,
          rowspan: 1,
          backgroundColor: "red",
          textColor: "white",
          textAlignment: "center",
        },
      };

      updatedRows[rows.length - 1] = {
        ...grandTotalRow,
        cells: updatedGrandTotalCells,
      };
    }

    return updatedRows as typeof tableBlock.content.rows;
  };

  // Renders the editor instance using a React component.
  return (
    <BlockNoteView
      editor={editor}
      onChange={(editor, { getChanges }) => {
        const changes = getChanges();

        if (changes.length === 0 || applying.current) return;

        // prevents a double onChange because we're updating the block here
        applying.current = true;

        changes.forEach((change) => {
          if (change.type === "update" && change.block.type === "table") {
            const updatedRows = calculateTableTotals(change.block);
            if (updatedRows) {
              // Use any type to bypass complex type checking for this demo
              editor.updateBlock(change.block, {
                type: "table",
                content: {
                  ...change.block.content,
                  rows: updatedRows,
                },
              });
            }
          }
        });

        requestAnimationFrame(() => (applying.current = false));
      }}
    ></BlockNoteView>
  );
}
