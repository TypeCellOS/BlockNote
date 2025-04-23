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
];
