import { ExportTestCase } from "../../../shared/formatConversion/export/exportTestCase.js";
import { TestExecutor, TestInstance } from "../../../types.js";
import {
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema,
} from "../../testSchema.js";

export const getExportTestInstances = (
  executeTest: TestExecutor<
    ExportTestCase<TestBlockSchema, TestInlineContentSchema, TestStyleSchema>,
    TestBlockSchema,
    TestInlineContentSchema,
    TestStyleSchema
  >
): TestInstance<
  ExportTestCase<TestBlockSchema, TestInlineContentSchema, TestStyleSchema>,
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema
>[] => [
  {
    testCase: {
      name: "paragraph/empty",
      content: [
        {
          type: "paragraph",
        },
      ],
    },
    executeTest,
  },
  {
    testCase: {
      name: "paragraph/basic",
      content: [
        {
          type: "paragraph",
          content: "Paragraph",
        },
      ],
    },
    executeTest,
  },
  {
    testCase: {
      name: "paragraph/styled",
      content: [
        {
          type: "paragraph",
          props: {
            textAlignment: "center",
            textColor: "orange",
            backgroundColor: "pink",
          },
          content: [
            {
              type: "text",
              styles: {},
              text: "Plain ",
            },
            {
              type: "text",
              styles: {
                textColor: "red",
              },
              text: "Red Text ",
            },
            {
              type: "text",
              styles: {
                backgroundColor: "blue",
              },
              text: "Blue Background ",
            },
            {
              type: "text",
              styles: {
                textColor: "red",
                backgroundColor: "blue",
              },
              text: "Mixed Colors",
            },
          ],
        },
      ],
    },
    executeTest,
  },
  {
    testCase: {
      name: "paragraph/nested",
      content: [
        {
          type: "paragraph",
          content: "Paragraph",
          children: [
            {
              type: "paragraph",
              content: "Nested Paragraph 1",
            },
            {
              type: "paragraph",
              content: "Nested Paragraph 2",
            },
          ],
        },
      ],
    },
    executeTest,
  },
  {
    testCase: {
      name: "paragraph/lineBreaks",
      content: [
        {
          type: "paragraph",
          content: "Line 1\nLine 2",
        },
      ],
    },
    executeTest,
  },
  {
    testCase: {
      name: "lists/basic",
      content: [
        {
          type: "bulletListItem",
          content: "Bullet List Item 1",
        },
        {
          type: "bulletListItem",
          content: "Bullet List Item 2",
        },
        {
          type: "numberedListItem",
          content: "Numbered List Item 1",
        },
        {
          type: "numberedListItem",
          content: "Numbered List Item 2",
        },
        {
          type: "checkListItem",
          content: "Check List Item 1",
        },
        {
          type: "checkListItem",
          props: {
            checked: true,
          },
          content: "Check List Item 2",
        },
      ],
    },
    executeTest,
  },
  {
    testCase: {
      name: "lists/nested",
      content: [
        {
          type: "bulletListItem",
          content: "Bullet List Item 1",
        },
        {
          type: "bulletListItem",
          content: "Bullet List Item 2",
          children: [
            {
              type: "numberedListItem",
              content: "Numbered List Item 1",
            },
            {
              type: "numberedListItem",
              content: "Numbered List Item 2",
              children: [
                {
                  type: "checkListItem",
                  content: "Check List Item 1",
                },
                {
                  type: "checkListItem",
                  props: {
                    checked: true,
                  },
                  content: "Check List Item 2",
                },
              ],
            },
          ],
        },
      ],
    },
    executeTest,
  },
  {
    testCase: {
      name: "codeBlock/empty",
      content: [
        {
          type: "codeBlock",
        },
      ],
    },
    executeTest,
  },
  {
    testCase: {
      name: "codeBlock/defaultLanguage",
      content: [
        {
          type: "codeBlock",
          content: "console.log('Hello, world!');",
        },
      ],
    },
    executeTest,
  },
  {
    testCase: {
      name: "codeBlock/python",
      content: [
        {
          type: "codeBlock",
          props: { language: "python" },
          content: "print('Hello, world!')",
        },
      ],
    },
    executeTest,
  },
  {
    testCase: {
      name: "codeBlock/contains-newlines",
      content: [
        {
          type: "codeBlock",
          props: { language: "javascript" },
          content: "const hello = 'world';\nconsole.log(hello);\n",
        },
      ],
    },
    executeTest,
  },
  {
    testCase: {
      name: "pageBreak/basic",
      content: [
        {
          type: "pageBreak",
        },
      ],
    },
    executeTest,
  },
  {
    testCase: {
      name: "file/button",
      content: [
        {
          type: "file",
        },
      ],
    },
    executeTest,
  },
  {
    testCase: {
      name: "file/basic",
      content: [
        {
          type: "file",
          props: {
            name: "example",
            url: "exampleURL",
            caption: "Caption",
          },
        },
      ],
    },
    executeTest,
  },
  {
    testCase: {
      name: "file/noName",
      content: [
        {
          type: "file",
          props: {
            url: "exampleURL",
            caption: "Caption",
          },
        },
      ],
    },
    executeTest,
  },
  {
    testCase: {
      name: "file/noCaption",
      content: [
        {
          type: "file",
          props: {
            name: "example",
            url: "exampleURL",
          },
        },
      ],
    },
    executeTest,
  },
  {
    testCase: {
      name: "file/nested",
      content: [
        {
          type: "file",
          props: {
            name: "example",
            url: "exampleURL",
            caption: "Caption",
          },
          children: [
            {
              type: "file",
              props: {
                name: "example",
                url: "exampleURL",
                caption: "Caption",
              },
            },
          ],
        },
      ],
    },
    executeTest,
  },
  {
    testCase: {
      name: "image/button",
      content: [
        {
          type: "image",
        },
      ],
    },
    executeTest,
  },
  {
    testCase: {
      name: "image/basic",
      content: [
        {
          type: "image",
          props: {
            name: "example",
            url: "exampleURL",
            caption: "Caption",
            previewWidth: 256,
          },
        },
      ],
    },
    executeTest,
  },
  {
    testCase: {
      name: "image/noName",
      content: [
        {
          type: "image",
          props: {
            url: "exampleURL",
            caption: "Caption",
            previewWidth: 256,
          },
        },
      ],
    },
    executeTest,
  },
  {
    testCase: {
      name: "image/noCaption",
      content: [
        {
          type: "image",
          props: {
            name: "example",
            url: "exampleURL",
            previewWidth: 256,
          },
        },
      ],
    },
    executeTest,
  },
  {
    testCase: {
      name: "image/noPreview",
      content: [
        {
          type: "image",
          props: {
            name: "example",
            url: "exampleURL",
            caption: "Caption",
            showPreview: false,
            previewWidth: 256,
          },
        },
      ],
    },
    executeTest,
  },
  {
    testCase: {
      name: "image/nested",
      content: [
        {
          type: "image",
          props: {
            url: "exampleURL",
            caption: "Caption",
            previewWidth: 256,
          },
          children: [
            {
              type: "image",
              props: {
                url: "exampleURL",
                caption: "Caption",
                previewWidth: 256,
              },
            },
          ],
        },
      ],
    },
    executeTest,
  },
  {
    testCase: {
      name: "table/basic",
      content: [
        {
          type: "table",
          content: {
            type: "tableContent",
            rows: [
              {
                cells: [
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                ],
              },
              {
                cells: [
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                ],
              },
              {
                cells: [
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
    },
    executeTest,
  },
  {
    testCase: {
      name: "table/allColWidths",
      content: [
        {
          type: "table",
          content: {
            type: "tableContent",
            columnWidths: [100, 200, 300],
            rows: [
              {
                cells: [
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                ],
              },
              {
                cells: [
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                ],
              },
              {
                cells: [
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
    },
    executeTest,
  },
  {
    testCase: {
      name: "table/mixedColWidths",
      content: [
        {
          type: "table",
          content: {
            type: "tableContent",
            columnWidths: [100, undefined, 300],
            rows: [
              {
                cells: [
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                ],
              },
              {
                cells: [
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                ],
              },
              {
                cells: [
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
    },
    executeTest,
  },
  {
    testCase: {
      name: "table/mixedCellColors",
      content: [
        {
          type: "table",
          content: {
            type: "tableContent",
            columnWidths: [100, undefined, 300],
            rows: [
              {
                cells: [
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "red",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "blue",
                    },
                  },
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "blue",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "yellow",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "red",
                    },
                  },
                ],
              },
              {
                cells: [
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                ],
              },
              {
                cells: [
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
    },
    executeTest,
  },
  {
    testCase: {
      name: "table/mixedRowspansAndColspans",
      content: [
        {
          type: "table",
          content: {
            type: "tableContent",
            columnWidths: [100, 200, 300],
            rows: [
              {
                cells: [
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "red",
                      colspan: 2,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "blue",
                    },
                  },
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "yellow",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "red",
                    },
                  },
                ],
              },
              {
                cells: [
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 2,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 2,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                ],
              },
              {
                cells: [
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
    },
    executeTest,
  },
  {
    testCase: {
      name: "table/headerRows",
      content: [
        {
          type: "table",
          content: {
            headerRows: 1,
            type: "tableContent",
            rows: [
              {
                cells: [
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                ],
              },
              {
                cells: [
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                ],
              },
              {
                cells: [
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
    },
    executeTest,
  },
  {
    testCase: {
      name: "table/headerCols",
      content: [
        {
          type: "table",
          content: {
            headerCols: 1,
            type: "tableContent",
            rows: [
              {
                cells: [
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                ],
              },
              {
                cells: [
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                ],
              },
              {
                cells: [
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                  {
                    type: "tableCell",
                    content: ["Table Cell"],
                    props: {
                      backgroundColor: "default",
                      colspan: 1,
                      rowspan: 1,
                      textAlignment: "left",
                      textColor: "default",
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
    },
    executeTest,
  },
  {
    testCase: {
      name: "link/basic",
      content: [
        {
          // id: UniqueID.options.generateID(),
          type: "paragraph",
          content: [
            {
              type: "link",
              href: "https://www.website.com",
              content: "Website",
            },
          ],
        },
      ],
    },
    executeTest,
  },
  {
    testCase: {
      name: "link/styled",
      content: [
        {
          // id: UniqueID.options.generateID(),
          type: "paragraph",
          content: [
            {
              type: "link",
              href: "https://www.website.com",
              content: [
                {
                  type: "text",
                  text: "Web",
                  styles: {
                    bold: true,
                  },
                },
                {
                  type: "text",
                  text: "site",
                  styles: {},
                },
              ],
            },
          ],
        },
      ],
    },
    executeTest,
  },
  {
    testCase: {
      name: "link/adjacent",
      content: [
        {
          // id: UniqueID.options.generateID(),
          type: "paragraph",
          content: [
            {
              type: "link",
              href: "https://www.website.com",
              content: "Website",
            },
            {
              type: "link",
              href: "https://www.website2.com",
              content: "Website2",
            },
          ],
        },
      ],
    },
    executeTest,
  },
  {
    testCase: {
      name: "hardbreak/basic",
      content: [
        {
          // id: UniqueID.options.generateID(),
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Text1\nText2",
              styles: {},
            },
          ],
        },
      ],
    },
    executeTest,
  },
  {
    testCase: {
      name: "hardbreak/multiple",
      content: [
        {
          // id: UniqueID.options.generateID(),
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Text1\nText2\nText3",
              styles: {},
            },
          ],
        },
      ],
    },
    executeTest,
  },
  {
    testCase: {
      name: "hardbreak/start",
      content: [
        {
          // id: UniqueID.options.generateID(),
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "\nText1",
              styles: {},
            },
          ],
        },
      ],
    },
    executeTest,
  },
  {
    testCase: {
      name: "hardbreak/end",
      content: [
        {
          // id: UniqueID.options.generateID(),
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Text1\n",
              styles: {},
            },
          ],
        },
      ],
    },
    executeTest,
  },
  {
    testCase: {
      name: "hardbreak/only",
      content: [
        {
          // id: UniqueID.options.generateID(),
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "\n",
              styles: {},
            },
          ],
        },
      ],
    },
    executeTest,
  },
  {
    testCase: {
      name: "hardbreak/styles",
      content: [
        {
          // id: UniqueID.options.generateID(),
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Text1\n",
              styles: {},
            },
            {
              type: "text",
              text: "Text2",
              styles: { bold: true },
            },
          ],
        },
      ],
    },
    executeTest,
  },
  {
    testCase: {
      name: "hardbreak/link",
      content: [
        {
          // id: UniqueID.options.generateID(),
          type: "paragraph",
          content: [
            {
              type: "link",
              href: "https://www.website.com",
              content: "Link1\nLink1",
            },
          ],
        },
      ],
    },
    executeTest,
  },
  {
    testCase: {
      name: "hardbreak/between-links",
      content: [
        {
          // id: UniqueID.options.generateID(),
          type: "paragraph",
          content: [
            {
              type: "link",
              href: "https://www.website.com",
              content: "Link1\n",
            },
            {
              type: "link",
              href: "https://www.website2.com",
              content: "Link2",
            },
          ],
        },
      ],
    },
    executeTest,
  },
  {
    testCase: {
      name: "complex/misc",
      content: [
        {
          // id: UniqueID.options.generateID(),
          type: "heading",
          props: {
            backgroundColor: "blue",
            textColor: "yellow",
            textAlignment: "right",
            level: 2,
          },
          content: [
            {
              type: "text",
              text: "Heading ",
              styles: {
                bold: true,
                underline: true,
              },
            },
            {
              type: "text",
              text: "2",
              styles: {
                italic: true,
                strike: true,
              },
            },
          ],
          children: [
            {
              // id: UniqueID.options.generateID(),
              type: "paragraph",
              props: {
                backgroundColor: "red",
              },
              content: "Paragraph",
              children: [],
            },
            {
              // id: UniqueID.options.generateID(),
              type: "bulletListItem",
              props: {},
            },
          ],
        },
      ],
    },
    executeTest,
  },
];
