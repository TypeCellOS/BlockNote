import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";

export default function App() {
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
            text: "Advanced Tables",
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
          columnWidths: [199, 148, 201],
          headerRows: 1,
          rows: [
            {
              cells: [
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "text",
                      text: "This row has headers",
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
                      text: "This is ",
                      styles: {},
                    },
                    {
                      type: "text",
                      text: "RED",
                      styles: {
                        bold: true,
                      },
                    },
                  ],
                  props: {
                    colspan: 1,
                    rowspan: 1,
                    backgroundColor: "red",
                    textColor: "default",
                    textAlignment: "center",
                  },
                },
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "text",
                      text: "Text is Blue",
                      styles: {},
                    },
                  ],
                  props: {
                    colspan: 1,
                    rowspan: 1,
                    backgroundColor: "default",
                    textColor: "blue",
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
                      text: "This spans 2 columns\nand 2 rows",
                      styles: {},
                    },
                  ],
                  props: {
                    colspan: 2,
                    rowspan: 2,
                    backgroundColor: "yellow",
                    textColor: "default",
                    textAlignment: "left",
                  },
                },
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "text",
                      text: "Sooo many features",
                      styles: {},
                    },
                  ],
                  props: {
                    colspan: 1,
                    rowspan: 1,
                    backgroundColor: "gray",
                    textColor: "default",
                    textAlignment: "left",
                  },
                },
              ],
            },
            {
              cells: [
                {
                  type: "tableCell",
                  content: [],
                  props: {
                    colspan: 1,
                    rowspan: 1,
                    backgroundColor: "gray",
                    textColor: "purple",
                    textAlignment: "left",
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
                      text: "A cell",
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
                      text: "Another Cell",
                      styles: {},
                    },
                  ],
                  props: {
                    colspan: 1,
                    rowspan: 1,
                    backgroundColor: "default",
                    textColor: "default",
                    textAlignment: "right",
                  },
                },
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "text",
                      text: "Aligned center",
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
            text: "Featuring:",
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
                text: "Cell background & foreground coloring",
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
                text: "Splitting & merging cells",
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
                text: "Header row & column",
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

  // Renders the editor instance using a React component.
  return <BlockNoteView editor={editor}></BlockNoteView>;
}
