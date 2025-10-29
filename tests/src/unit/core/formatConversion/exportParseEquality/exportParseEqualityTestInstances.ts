import { ExportParseEqualityTestCase } from "../../../shared/formatConversion/exportParseEquality/exportParseEqualityTestCase.js";
import {
  testExportParseEqualityBlockNoteHTML,
  testExportParseEqualityHTML,
} from "../../../shared/formatConversion/exportParseEquality/exportParseEqualityTestExecutors.js";
import { TestInstance } from "../../../types.js";
import {
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema,
} from "../../testSchema.js";
import { exportTestInstancesBlockNoteHTML } from "../export/exportTestInstances.js";

export const exportParseEqualityTestInstancesBlockNoteHTML: TestInstance<
  ExportParseEqualityTestCase<
    TestBlockSchema,
    TestInlineContentSchema,
    TestStyleSchema
  >,
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema
>[] = exportTestInstancesBlockNoteHTML
  .filter(({ testCase }) => !testCase.name.startsWith("partial/"))
  .map(({ testCase }) => ({
    testCase,
    executeTest: testExportParseEqualityBlockNoteHTML,
  }));

export const exportParseEqualityTestInstancesHTML: TestInstance<
  ExportParseEqualityTestCase<
    TestBlockSchema,
    TestInlineContentSchema,
    TestStyleSchema
  >,
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema
>[] = [
  {
    testCase: {
      name: "schema/blocks",
      content: [
        {
          type: "paragraph",
          content: "Paragraph",
        },
        {
          type: "heading",
          content: "Heading",
        },
        {
          type: "quote",
          content: "Quote",
        },
        {
          type: "bulletListItem",
          content: "Bullet List Item",
        },
        {
          type: "numberedListItem",
          content: "Numbered List Item",
        },
        {
          type: "checkListItem",
          content: "Check List Item",
        },
        {
          type: "divider",
        },
        {
          type: "codeBlock",
          content: "Code",
        },
        {
          type: "table",
          content: {
            type: "tableContent",
            rows: [
              {
                cells: ["Table Cell", "Table Cell"],
              },
              {
                cells: ["Table Cell", "Table Cell"],
              },
            ],
          },
        },
      ],
    },
    executeTest: testExportParseEqualityHTML,
  },
  {
    testCase: {
      name: "schema/blockProps",
      content: [
        {
          type: "paragraph",
          content: "Paragraph",
          props: {
            textColor: "red",
            backgroundColor: "blue",
            textAlignment: "center",
          },
        },
        {
          type: "heading",
          content: "Heading",
          props: {
            level: 2,
          },
        },
        {
          type: "checkListItem",
          content: "Check List Item",
          props: {
            checked: true,
            textColor: "red",
            backgroundColor: "blue",
            textAlignment: "center",
          },
        },
        {
          type: "codeBlock",
          content: "Code",
          props: { language: "javascript" },
        },
      ],
    },
    executeTest: testExportParseEqualityHTML,
  },
  {
    testCase: {
      name: "schema/inlineContent",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Text ",
              styles: {},
            },
            {
              type: "link",
              content: "Link",
              href: "https://example.com",
            },
          ],
        },
      ],
    },
    executeTest: testExportParseEqualityHTML,
  },
  {
    testCase: {
      name: "schema/styles",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "T",
              styles: {
                bold: true,
                italic: true,
                underline: true,
                strike: true,
                // Code cannot be applied on top of other styles.
                // code: true,
                textColor: "red",
                backgroundColor: "blue",
              },
            },
          ],
        },
      ],
    },
    executeTest: testExportParseEqualityHTML,
  },
  {
    testCase: {
      name: "lists/nested",
      content: [
        {
          type: "bulletListItem",
          content: "List Item 1",
          children: [
            {
              type: "bulletListItem",
              content: "Nested List Item 1",
            },
            {
              type: "bulletListItem",
              content: "Nested List Item 2",
            },
          ],
        },
        {
          type: "bulletListItem",
          content: "List Item 2",
        },
      ],
    },
    executeTest: testExportParseEqualityHTML,
  },
  {
    testCase: {
      name: "tables/advanced",
      content: [
        {
          type: "table",
          content: {
            type: "tableContent",
            columnWidths: [199, 148, 201],
            headerRows: 1,
            rows: [
              {
                cells: [
                  {
                    type: "tableCell",
                    content: "This row has headers",
                    props: {
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
                      backgroundColor: "red",
                      textAlignment: "center",
                    },
                  },
                  {
                    type: "tableCell",
                    content: "Text is Blue",
                    props: {
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
                    content: "This spans 2 columns\nand 2 rows",
                    props: {
                      colspan: 2,
                      rowspan: 2,
                      backgroundColor: "yellow",
                    },
                  },
                  {
                    type: "tableCell",
                    content: "Sooo many features",
                    props: {
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
                      backgroundColor: "gray",
                      textColor: "purple",
                    },
                  },
                ],
              },
              {
                cells: [
                  {
                    type: "tableCell",
                    content: "A cell",
                  },
                  {
                    type: "tableCell",
                    content: "Another Cell",
                  },
                  {
                    type: "tableCell",
                    content: "Aligned center",
                    props: {
                      textAlignment: "center",
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
    },
    executeTest: testExportParseEqualityHTML,
  },
];
