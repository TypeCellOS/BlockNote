import { ExportTestCase } from "../../../shared/formatConversion/export/exportTestCase.js";
import {
  testExportBlockNoteHTML,
  testExportHTML,
  testExportMarkdown,
  testExportNodes,
} from "../../../shared/formatConversion/export/exportTestExecutors.js";
import { TestInstance } from "../../../types.js";
import {
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema,
} from "../../testSchema.js";

export const exportTestInstancesBlockNoteHTML: TestInstance<
  ExportTestCase<TestBlockSchema, TestInlineContentSchema, TestStyleSchema>,
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema
>[] = [
  {
    testCase: {
      name: "paragraph/empty",
      content: [
        {
          type: "paragraph",
        },
      ],
    },
    executeTest: testExportBlockNoteHTML,
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
    executeTest: testExportBlockNoteHTML,
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
    executeTest: testExportBlockNoteHTML,
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
    executeTest: testExportBlockNoteHTML,
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
    executeTest: testExportBlockNoteHTML,
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
        {
          type: "toggleListItem",
          content: "Toggle List Item 1",
        },
      ],
    },
    executeTest: testExportBlockNoteHTML,
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
                  children: [
                    {
                      type: "toggleListItem",
                      content: "Toggle List Item 1",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    executeTest: testExportBlockNoteHTML,
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
    executeTest: testExportBlockNoteHTML,
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
    executeTest: testExportBlockNoteHTML,
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
    executeTest: testExportBlockNoteHTML,
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
      name: "divider/basic",
      content: [
        {
          type: "divider",
        },
      ],
    },
    executeTest: testExportBlockNoteHTML,
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
    executeTest: testExportBlockNoteHTML,
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
    executeTest: testExportBlockNoteHTML,
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
    executeTest: testExportBlockNoteHTML,
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
    executeTest: testExportBlockNoteHTML,
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
    executeTest: testExportBlockNoteHTML,
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
    executeTest: testExportBlockNoteHTML,
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
    executeTest: testExportBlockNoteHTML,
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
    executeTest: testExportBlockNoteHTML,
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
    executeTest: testExportBlockNoteHTML,
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
    executeTest: testExportBlockNoteHTML,
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
    executeTest: testExportBlockNoteHTML,
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
    executeTest: testExportBlockNoteHTML,
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
    executeTest: testExportBlockNoteHTML,
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
    executeTest: testExportBlockNoteHTML,
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
    executeTest: testExportBlockNoteHTML,
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
    executeTest: testExportBlockNoteHTML,
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
    executeTest: testExportBlockNoteHTML,
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
    executeTest: testExportBlockNoteHTML,
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
    executeTest: testExportBlockNoteHTML,
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
    executeTest: testExportBlockNoteHTML,
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
    executeTest: testExportBlockNoteHTML,
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
    executeTest: testExportBlockNoteHTML,
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
    executeTest: testExportBlockNoteHTML,
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
    executeTest: testExportBlockNoteHTML,
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
    executeTest: testExportBlockNoteHTML,
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
    executeTest: testExportBlockNoteHTML,
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
    executeTest: testExportBlockNoteHTML,
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
    executeTest: testExportBlockNoteHTML,
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
    executeTest: testExportBlockNoteHTML,
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
    executeTest: testExportBlockNoteHTML,
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
      name: "malformed/JSON",
      content: [
        {
          // id: UniqueID.options.generateID(),
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Text1\n",
              styles: {
                bold: false,
              },
            },
            {
              type: "text",
              text: "Text2\n",
              styles: {
                italic: false,
                fontSize: "",
              },
            },
            {
              type: "text",
              text: "Text3\n",
              styles: {
                italic: false,
                code: false,
              },
            },
          ],
        },
      ],
    },
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
      name: "image",
      content: [
        {
          type: "image",
          props: {
            url: "https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png",
          },
        },
      ],
    },
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
      name: "video",
      content: [
        {
          type: "video",
          props: {
            url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm",
          },
        },
      ],
    },
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
      name: "inlineContent/mentionWithToExternalHTML",
      content: [
        {
          type: "paragraph",
          content: [
            "I enjoy working with ",
            {
              type: "mention",
              props: {
                user: "Matthew",
              },
              content: undefined,
            },
          ],
        },
      ],
    },
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
      name: "inlineContent/tagWithoutToExternalHTML",
      content: [
        {
          type: "paragraph",
          content: [
            "I love ",
            {
              type: "tag",
              content: "BlockNote",
            },
          ],
        },
      ],
    },
    executeTest: testExportBlockNoteHTML,
  },
];

export const exportTestInstancesHTML: TestInstance<
  ExportTestCase<TestBlockSchema, TestInlineContentSchema, TestStyleSchema>,
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema
>[] = exportTestInstancesBlockNoteHTML.map(({ testCase }) => ({
  testCase,
  executeTest: testExportHTML,
}));

export const exportTestInstancesMarkdown: TestInstance<
  ExportTestCase<TestBlockSchema, TestInlineContentSchema, TestStyleSchema>,
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema
>[] = exportTestInstancesBlockNoteHTML.map(({ testCase }) => ({
  testCase,
  executeTest: testExportMarkdown,
}));

export const exportTestInstancesNodes: TestInstance<
  ExportTestCase<TestBlockSchema, TestInlineContentSchema, TestStyleSchema>,
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema
>[] = exportTestInstancesBlockNoteHTML.map(({ testCase }) => ({
  testCase,
  executeTest: testExportNodes,
}));
