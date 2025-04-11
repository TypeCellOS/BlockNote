import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import { CellSelection } from "@tiptap/pm/tables";

import {
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema,
} from "../../testSchema.js";
import { CopyTestCase } from "../../../shared/clipboard/copy/copyTestCase.js";
import { testCopyHTML } from "../../../shared/clipboard/copy/copyTestExecutors.js";
import { TestInstance } from "../../../types.js";
import {
  getPosOfTableCellNode,
  getPosOfTextNode,
} from "../clipboardTestUtil.js";

export const copyTestInstancesHTML: TestInstance<
  CopyTestCase<TestBlockSchema, TestInlineContentSchema, TestStyleSchema>,
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema
>[] = [
  {
    testCase: {
      name: "multipleChildren",
      document: [
        {
          type: "paragraph",
          content: "Paragraph 1",
          children: [
            {
              type: "paragraph",
              content: "Nested Paragraph 1",
            },
            {
              type: "paragraph",
              content: "Nested Paragraph 2",
            },
            {
              type: "paragraph",
              content: "Nested Paragraph 3",
            },
          ],
        },
      ],
      getCopySelection: (doc) => {
        const startPos = getPosOfTextNode(doc, "Nested Paragraph 1");
        const endPos = getPosOfTextNode(doc, "Nested Paragraph 3", true);

        return TextSelection.create(doc, startPos, endPos);
      },
    },
    executeTest: testCopyHTML,
  },
  {
    testCase: {
      name: "childToParent",
      document: [
        {
          type: "paragraph",
          content: "Paragraph 1",
          children: [
            {
              type: "paragraph",
              content: "Nested Paragraph 1",
            },
            {
              type: "paragraph",
              content: "Nested Paragraph 2",
            },
            {
              type: "paragraph",
              content: "Nested Paragraph 3",
            },
          ],
        },
      ],
      getCopySelection: (doc) => {
        const startPos = getPosOfTextNode(doc, "Paragraph 1");
        const endPos = getPosOfTextNode(doc, "Nested Paragraph 1", true);

        return TextSelection.create(doc, startPos, endPos);
      },
    },
    executeTest: testCopyHTML,
  },
  {
    testCase: {
      name: "partialChildToParent",
      document: [
        {
          type: "paragraph",
          content: "Paragraph 1",
          children: [
            {
              type: "paragraph",
              content: "Nested Paragraph 1",
            },
            {
              type: "paragraph",
              content: "Nested Paragraph 2",
            },
            {
              type: "paragraph",
              content: "Nested Paragraph 3",
            },
          ],
        },
      ],
      getCopySelection: (doc) => {
        const startPos = getPosOfTextNode(doc, "Paragraph 1") + 1;
        const endPos = getPosOfTextNode(doc, "Nested Paragraph 1") + 1;

        return TextSelection.create(doc, startPos, endPos);
      },
    },
    executeTest: testCopyHTML,
  },
  {
    testCase: {
      name: "childrenToNextParent",
      document: [
        {
          type: "paragraph",
          content: "Paragraph 1",
          children: [
            {
              type: "paragraph",
              content: "Nested Paragraph 1",
            },
            {
              type: "paragraph",
              content: "Nested Paragraph 2",
            },
            {
              type: "paragraph",
              content: "Nested Paragraph 3",
            },
          ],
        },
        {
          type: "paragraph",
          content: "Paragraph 2",
        },
      ],
      getCopySelection: (doc) => {
        const startPos = getPosOfTextNode(doc, "Nested Paragraph 1");
        const endPos = getPosOfTextNode(doc, "Paragraph 2", true);

        return TextSelection.create(doc, startPos, endPos);
      },
    },
    executeTest: testCopyHTML,
  },
  {
    testCase: {
      name: "childrenToNextParentsChildren",
      document: [
        {
          type: "paragraph",
          content: "Paragraph 1",
          children: [
            {
              type: "paragraph",
              content: "Nested Paragraph 1",
            },
            {
              type: "paragraph",
              content: "Nested Paragraph 2",
            },
            {
              type: "paragraph",
              content: "Nested Paragraph 3",
            },
          ],
        },
        {
          type: "paragraph",
          content: "Paragraph 2",
          children: [
            {
              type: "paragraph",
              content: "Nested Paragraph 4",
            },
            {
              type: "paragraph",
              content: "Nested Paragraph 5",
            },
            {
              type: "paragraph",
              content: "Nested Paragraph 6",
            },
          ],
        },
      ],
      getCopySelection: (doc) => {
        const startPos = getPosOfTextNode(doc, "Nested Paragraph 1");
        const endPos = getPosOfTextNode(doc, "Nested Paragraph 6", true);

        return TextSelection.create(doc, startPos, endPos);
      },
    },
    executeTest: testCopyHTML,
  },
  {
    testCase: {
      name: "unstyledText",
      document: [
        {
          type: "heading",
          content: "Unstyled Text",
        },
      ],
      getCopySelection: (doc) => {
        const startPos = getPosOfTextNode(doc, "Unstyled Text");
        const endPos = getPosOfTextNode(doc, "Unstyled Text", true);

        return TextSelection.create(doc, startPos, endPos);
      },
    },
    executeTest: testCopyHTML,
  },
  {
    testCase: {
      name: "styledText",
      document: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Unstyled Text",
              styles: {},
            },
            {
              type: "text",
              text: "Italic Text",
              styles: {
                italic: true,
              },
            },
          ],
        },
      ],
      getCopySelection: (doc) => {
        const startPos = getPosOfTextNode(doc, "Italic Text");
        const endPos = getPosOfTextNode(doc, "Italic Text", true);

        return TextSelection.create(doc, startPos, endPos);
      },
    },
    executeTest: testCopyHTML,
  },
  {
    testCase: {
      name: "multipleStyledText",
      document: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Unstyled Text",
              styles: {},
            },
            {
              type: "text",
              text: "Italic Text",
              styles: {
                italic: true,
              },
            },
            {
              type: "text",
              text: "Bold Text",
              styles: {
                bold: true,
              },
            },
          ],
        },
      ],
      getCopySelection: (doc) => {
        const startPos = getPosOfTextNode(doc, "Unstyled Text");
        const endPos = getPosOfTextNode(doc, "Bold Text", true);

        return TextSelection.create(doc, startPos, endPos);
      },
    },
    executeTest: testCopyHTML,
  },
  {
    testCase: {
      name: "image",
      document: [
        {
          type: "image",
          props: {
            url: "https://ralfvanveen.com/wp-content/uploads/2021/06/Placeholder-_-Glossary.svg",
          },
        },
      ],
      getCopySelection: (doc) => {
        let startPos: number | undefined = undefined;

        doc.descendants((node, pos) => {
          if (node.type.name === "image") {
            startPos = pos;
          }
        });

        if (startPos === undefined) {
          throw new Error("Image node not found.");
        }

        return NodeSelection.create(doc, startPos);
      },
    },
    executeTest: testCopyHTML,
  },
  {
    testCase: {
      name: "nestedImage",
      document: [
        {
          type: "paragraph",
          content: "Paragraph 1",
          children: [
            {
              type: "image",
              props: {
                url: "https://ralfvanveen.com/wp-content/uploads/2021/06/Placeholder-_-Glossary.svg",
              },
              children: [
                {
                  type: "paragraph",
                  content: "Nested Paragraph 1",
                },
              ],
            },
          ],
        },
      ],
      getCopySelection: (doc) => {
        const startPos = getPosOfTextNode(doc, "Paragraph 1");
        const endPos = getPosOfTextNode(doc, "Nested Paragraph 1", true);

        return TextSelection.create(doc, startPos, endPos);
      },
    },
    executeTest: testCopyHTML,
  },
  {
    testCase: {
      name: "tableCellText",
      document: [
        {
          type: "table",
          content: {
            type: "tableContent",
            rows: [
              {
                cells: [["Table Cell 1"], ["Table Cell 2"]],
              },
              {
                cells: [["Table Cell 3"], ["Table Cell 4"]],
              },
            ],
          },
        },
      ],
      getCopySelection: (doc) => {
        const startPos = getPosOfTextNode(doc, "Table Cell 1");
        const endPos = getPosOfTextNode(doc, "Table Cell 1", true);

        return TextSelection.create(doc, startPos, endPos);
      },
    },
    executeTest: testCopyHTML,
  },
  {
    testCase: {
      name: "tableCell",
      document: [
        {
          type: "table",
          content: {
            type: "tableContent",
            rows: [
              {
                cells: [["Table Cell 1"], ["Table Cell 2"]],
              },
              {
                cells: [["Table Cell 3"], ["Table Cell 4"]],
              },
            ],
          },
        },
      ],
      getCopySelection: (doc) => {
        const startPos = getPosOfTableCellNode(doc, "Table Cell 1");

        return CellSelection.create(doc, startPos);
      },
    },
    executeTest: testCopyHTML,
  },
  {
    testCase: {
      name: "tableRow",
      document: [
        {
          type: "table",
          content: {
            type: "tableContent",
            rows: [
              {
                cells: [["Table Cell 1"], ["Table Cell 2"]],
              },
              {
                cells: [["Table Cell 3"], ["Table Cell 4"]],
              },
            ],
          },
        },
      ],
      getCopySelection: (doc) => {
        const startPos = getPosOfTableCellNode(doc, "Table Cell 1");
        const endPos = getPosOfTableCellNode(doc, "Table Cell 2");

        return CellSelection.create(doc, startPos, endPos);
      },
    },
    executeTest: testCopyHTML,
  },
  {
    testCase: {
      name: "tableCol",
      document: [
        {
          type: "table",
          content: {
            type: "tableContent",
            rows: [
              {
                cells: [["Table Cell 1"], ["Table Cell 2"]],
              },
              {
                cells: [["Table Cell 3"], ["Table Cell 4"]],
              },
            ],
          },
        },
      ],
      getCopySelection: (doc) => {
        const startPos = getPosOfTableCellNode(doc, "Table Cell 1");
        const endPos = getPosOfTableCellNode(doc, "Table Cell 3");

        return CellSelection.create(doc, startPos, endPos);
      },
    },
    executeTest: testCopyHTML,
  },
  {
    testCase: {
      name: "tableAllCells",
      document: [
        {
          type: "table",
          content: {
            type: "tableContent",
            rows: [
              {
                cells: [["Table Cell 1"], ["Table Cell 2"]],
              },
              {
                cells: [["Table Cell 3"], ["Table Cell 4"]],
              },
            ],
          },
        },
      ],
      getCopySelection: (doc) => {
        const startPos = getPosOfTableCellNode(doc, "Table Cell 1");
        const endPos = getPosOfTableCellNode(doc, "Table Cell 4");

        return CellSelection.create(doc, startPos, endPos);
      },
    },
    executeTest: testCopyHTML,
  },
  // TODO: 2 tests below necessary?
  {
    testCase: {
      name: "basicBlocks",
      document: [
        {
          type: "paragraph",
          content: "Paragraph 1",
        },
        {
          type: "heading",
          content: "Heading 1",
        },
        {
          type: "numberedListItem",
          content: "Numbered List Item 1",
        },
        {
          type: "bulletListItem",
          content: "Bullet List Item 1",
        },
        {
          type: "checkListItem",
          content: "Check List Item 1",
        },
        {
          type: "codeBlock",
          content: 'console.log("Hello World");',
        },
        {
          type: "table",
          content: {
            type: "tableContent",
            rows: [
              {
                cells: [["Table Cell 1"], ["Table Cell 2"]],
              },
              {
                cells: [["Table Cell 3"], ["Table Cell 4"]],
              },
            ],
          },
        },
        {
          type: "image",
        },
        {
          type: "paragraph",
          content: "Paragraph 2",
        },
      ],
      getCopySelection: (doc) => {
        const startPos = getPosOfTextNode(doc, "Paragraph 1");
        const endPos = getPosOfTextNode(doc, "Paragraph 2", true);

        return TextSelection.create(doc, startPos, endPos);
      },
    },
    executeTest: testCopyHTML,
  },
  {
    testCase: {
      name: "basicBlocksWithProps",
      document: [
        {
          type: "paragraph",
          props: {
            textColor: "red",
          },
          content: "Paragraph 1",
        },
        {
          type: "heading",
          props: {
            level: 2,
          },
          content: "Heading 1",
        },
        {
          type: "numberedListItem",
          props: {
            start: 2,
          },
          content: "Numbered List Item 1",
        },
        {
          type: "bulletListItem",
          props: {
            backgroundColor: "red",
          },
          content: "Bullet List Item 1",
        },
        {
          type: "checkListItem",
          props: {
            checked: true,
          },
          content: "Check List Item 1",
        },
        {
          type: "codeBlock",
          props: {
            language: "typescript",
          },
          content: 'console.log("Hello World");',
        },
        {
          type: "table",
          content: {
            type: "tableContent",
            rows: [
              {
                cells: [["Table Cell 1"], ["Table Cell 2"]],
              },
              {
                cells: [["Table Cell 3"], ["Table Cell 4"]],
              },
            ],
          },
        },
        {
          type: "image",
          props: {
            name: "1280px-Placeholder_view_vector.svg.png",
            url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Placeholder_view_vector.svg/1280px-Placeholder_view_vector.svg.png",
            caption: "Placeholder",
            showPreview: true,
            previewWidth: 256,
          },
        },
        {
          type: "paragraph",
          content: "Paragraph 2",
        },
      ],
      getCopySelection: (doc) => {
        const startPos = getPosOfTextNode(doc, "Paragraph 1");
        const endPos = getPosOfTextNode(doc, "Paragraph 2", true);

        return TextSelection.create(doc, startPos, endPos);
      },
    },
    executeTest: testCopyHTML,
  },
];
