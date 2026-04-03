import { ExportParseEqualityTestCase } from "../../../shared/formatConversion/exportParseEquality/exportParseEqualityTestCase.js";
import {
  testExportParseEqualityBlockNoteHTML,
  testExportParseEqualityHTML,
  testExportParseEqualityMarkdown,
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
>[] = exportTestInstancesBlockNoteHTML.map(({ testCase }) => ({
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
      name: "lists/toggleListItem",
      content: [
        {
          type: "toggleListItem",
          content: "Toggle List Item",
        },
      ],
    },
    executeTest: testExportParseEqualityHTML,
  },
  {
    testCase: {
      name: "lists/toggleListItemWithChildren",
      content: [
        {
          type: "toggleListItem",
          content: "Toggle List Item",
          children: [
            {
              type: "paragraph",
              content: "Child 1",
            },
            {
              type: "paragraph",
              content: "Child 2",
            },
          ],
        },
      ],
    },
    executeTest: testExportParseEqualityHTML,
  },
  {
    testCase: {
      name: "lists/toggleHeading",
      content: [
        {
          type: "heading",
          props: {
            level: 2,
            isToggleable: true,
          },
          content: "Toggle Heading",
          children: [
            {
              type: "paragraph",
              content: "Heading Child 1",
            },
          ],
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

// Markdown round-trip tests: blocks → markdown → blocks
// Markdown is a lossy format (no colors, underline, alignment), so these tests
// use snapshot matching to capture the expected round-trip result rather than
// strict equality with the input. This is critical for verifying that the
// custom markdown parser/serializer produces the same round-trip results.
export const exportParseEqualityTestInstancesMarkdown: TestInstance<
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
      name: "markdown/paragraph",
      content: [
        {
          type: "paragraph",
          content: "Simple paragraph",
        },
      ],
    },
    executeTest: testExportParseEqualityMarkdown,
  },
  {
    testCase: {
      name: "markdown/multipleParagraphs",
      content: [
        {
          type: "paragraph",
          content: "First paragraph",
        },
        {
          type: "paragraph",
          content: "Second paragraph",
        },
      ],
    },
    executeTest: testExportParseEqualityMarkdown,
  },
  {
    testCase: {
      name: "markdown/headingLevels",
      content: [
        {
          type: "heading",
          props: { level: 1 },
          content: "Heading 1",
        },
        {
          type: "heading",
          props: { level: 2 },
          content: "Heading 2",
        },
        {
          type: "heading",
          props: { level: 3 },
          content: "Heading 3",
        },
      ],
    },
    executeTest: testExportParseEqualityMarkdown,
  },
  {
    testCase: {
      name: "markdown/bulletList",
      content: [
        {
          type: "bulletListItem",
          content: "Item 1",
        },
        {
          type: "bulletListItem",
          content: "Item 2",
        },
      ],
    },
    executeTest: testExportParseEqualityMarkdown,
  },
  {
    testCase: {
      name: "markdown/numberedList",
      content: [
        {
          type: "numberedListItem",
          content: "Item 1",
        },
        {
          type: "numberedListItem",
          content: "Item 2",
        },
      ],
    },
    executeTest: testExportParseEqualityMarkdown,
  },
  {
    testCase: {
      name: "markdown/checkList",
      content: [
        {
          type: "checkListItem",
          content: "Unchecked",
        },
        {
          type: "checkListItem",
          props: { checked: true },
          content: "Checked",
        },
      ],
    },
    executeTest: testExportParseEqualityMarkdown,
  },
  {
    testCase: {
      name: "markdown/nestedLists",
      content: [
        {
          type: "bulletListItem",
          content: "Parent",
          children: [
            {
              type: "numberedListItem",
              content: "Child 1",
            },
            {
              type: "numberedListItem",
              content: "Child 2",
            },
          ],
        },
      ],
    },
    executeTest: testExportParseEqualityMarkdown,
  },
  {
    testCase: {
      name: "markdown/codeBlock",
      content: [
        {
          type: "codeBlock",
          props: { language: "javascript" },
          content: "const x = 42;",
        },
      ],
    },
    executeTest: testExportParseEqualityMarkdown,
  },
  {
    testCase: {
      name: "markdown/divider",
      content: [
        {
          type: "paragraph",
          content: "Before",
        },
        {
          type: "divider",
        },
        {
          type: "paragraph",
          content: "After",
        },
      ],
    },
    executeTest: testExportParseEqualityMarkdown,
  },
  {
    testCase: {
      name: "markdown/bold",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Bold text",
              styles: { bold: true },
            },
          ],
        },
      ],
    },
    executeTest: testExportParseEqualityMarkdown,
  },
  {
    testCase: {
      name: "markdown/italic",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Italic text",
              styles: { italic: true },
            },
          ],
        },
      ],
    },
    executeTest: testExportParseEqualityMarkdown,
  },
  {
    testCase: {
      name: "markdown/strike",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Strikethrough text",
              styles: { strike: true },
            },
          ],
        },
      ],
    },
    executeTest: testExportParseEqualityMarkdown,
  },
  {
    testCase: {
      name: "markdown/inlineCode",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Code text",
              styles: { code: true },
            },
          ],
        },
      ],
    },
    executeTest: testExportParseEqualityMarkdown,
  },
  {
    testCase: {
      name: "markdown/boldItalic",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Bold and italic",
              styles: { bold: true, italic: true },
            },
          ],
        },
      ],
    },
    executeTest: testExportParseEqualityMarkdown,
  },
  {
    testCase: {
      name: "markdown/link",
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
            {
              type: "text",
              text: " more text",
              styles: {},
            },
          ],
        },
      ],
    },
    executeTest: testExportParseEqualityMarkdown,
  },
  {
    testCase: {
      name: "markdown/image",
      content: [
        {
          type: "image",
          props: {
            url: "https://example.com/image.png",
            name: "Example",
          },
        },
      ],
    },
    executeTest: testExportParseEqualityMarkdown,
  },
  {
    testCase: {
      name: "markdown/video",
      content: [
        {
          type: "video",
          props: {
            url: "https://example.com/video.mp4",
            name: "Example",
          },
        },
      ],
    },
    executeTest: testExportParseEqualityMarkdown,
  },
  {
    testCase: {
      name: "markdown/table",
      content: [
        {
          type: "table",
          content: {
            type: "tableContent",
            rows: [
              {
                cells: ["Header 1", "Header 2"],
              },
              {
                cells: ["Cell 1", "Cell 2"],
              },
            ],
          },
        },
      ],
    },
    executeTest: testExportParseEqualityMarkdown,
  },
  {
    testCase: {
      name: "markdown/quote",
      content: [
        {
          type: "quote",
          content: "A quote",
        },
      ],
    },
    executeTest: testExportParseEqualityMarkdown,
  },
  {
    testCase: {
      name: "markdown/hardBreak",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Line 1\nLine 2",
              styles: {},
            },
          ],
        },
      ],
    },
    executeTest: testExportParseEqualityMarkdown,
  },
  {
    testCase: {
      name: "markdown/mixedStyles",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Normal ",
              styles: {},
            },
            {
              type: "text",
              text: "bold ",
              styles: { bold: true },
            },
            {
              type: "text",
              text: "italic ",
              styles: { italic: true },
            },
            {
              type: "text",
              text: "strike",
              styles: { strike: true },
            },
          ],
        },
      ],
    },
    executeTest: testExportParseEqualityMarkdown,
  },
  {
    testCase: {
      name: "markdown/complexDocument",
      content: [
        {
          type: "heading",
          props: { level: 1 },
          content: "Title",
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Paragraph with ",
              styles: {},
            },
            {
              type: "text",
              text: "bold",
              styles: { bold: true },
            },
            {
              type: "text",
              text: " text.",
              styles: {},
            },
          ],
        },
        {
          type: "bulletListItem",
          content: "Bullet 1",
        },
        {
          type: "bulletListItem",
          content: "Bullet 2",
        },
        {
          type: "divider",
        },
        {
          type: "codeBlock",
          props: { language: "python" },
          content: "print('hello')",
        },
      ],
    },
    executeTest: testExportParseEqualityMarkdown,
  },
  {
    testCase: {
      name: "markdown/deeplyNestedLists",
      content: [
        {
          type: "bulletListItem",
          content: "Level 1 bullet",
          children: [
            {
              type: "numberedListItem",
              content: "Level 2 numbered",
              children: [
                {
                  type: "bulletListItem",
                  content: "Level 3 bullet",
                  children: [
                    {
                      type: "numberedListItem",
                      content: "Level 4 numbered",
                    },
                  ],
                },
              ],
            },
            {
              type: "numberedListItem",
              content: "Level 2 sibling",
            },
          ],
        },
        {
          type: "bulletListItem",
          content: "Another top-level bullet",
          children: [
            {
              type: "bulletListItem",
              content: "Child of second bullet",
              children: [
                {
                  type: "checkListItem",
                  content: "Deep checklist item",
                },
              ],
            },
          ],
        },
      ],
    },
    executeTest: testExportParseEqualityMarkdown,
  },
  {
    testCase: {
      name: "markdown/specialCharEscaping",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Literal *asterisks* and **double asterisks**",
              styles: {},
            },
          ],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Backticks ` in plain text and `` double ``",
              styles: {},
            },
          ],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Underscores _here_ and ~tildes~ and [brackets]",
              styles: {},
            },
          ],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Pipes | and backslash \\ and #hash at start",
              styles: {},
            },
          ],
        },
        {
          type: "codeBlock",
          props: { language: "" },
          // eslint-disable-next-line no-template-curly-in-string
          content: "const x = `template ${literal}`;\nconst y = '```triple backticks```';",
        },
      ],
    },
    executeTest: testExportParseEqualityMarkdown,
  },
];
