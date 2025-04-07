import { Node } from "@tiptap/pm/model";
import { NodeSelection, Selection, TextSelection } from "@tiptap/pm/state";
import { CellSelection } from "@tiptap/pm/tables";

import { PartialBlock } from "../../../../blocks/defaultBlocks.js";
import {
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema,
} from "../../testSchema.js";
import {
  getPosOfTableCellNode,
  getPosOfTextNode,
} from "../clipboardTestUtil.js";

export type CopyTestCase = {
  name: string;
  // At some point we probably want to only have one HTML format that is both
  // lossless when converting to/from blocks, in which case we will only need
  // "html" test cases and can remove "blockNoteHTML".
  clipboardDataType: "blocknote/html" | "text/html" | "text/plain";
  document: PartialBlock<
    TestBlockSchema,
    TestInlineContentSchema,
    TestStyleSchema
  >[];
  getCopySelection: (pmDoc: Node) => Selection;
};

export const getCopyTestCases = (): CopyTestCase[] => [
  {
    name: "multipleChildren",
    clipboardDataType: "text/html",
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
  {
    name: "childToParent",
    clipboardDataType: "text/html",
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
  {
    name: "partialChildToParent",
    clipboardDataType: "text/html",
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
  {
    name: "childrenToNextParent",
    clipboardDataType: "text/html",
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
  {
    name: "childrenToNextParentsChildren",
    clipboardDataType: "text/html",
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
  {
    name: "unstyledText",
    clipboardDataType: "text/html",
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
  {
    name: "styledText",
    clipboardDataType: "text/html",
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
  {
    name: "multipleStyledText",
    clipboardDataType: "text/html",
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
  {
    name: "image",
    clipboardDataType: "text/html",
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
  {
    name: "nestedImage",
    clipboardDataType: "text/html",
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
  {
    name: "tableCellText",
    clipboardDataType: "text/html",
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
  // TODO: External HTML is wrapped in unnecessary `tr` element.
  {
    name: "tableCell",
    clipboardDataType: "text/html",
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
  {
    name: "tableRow",
    clipboardDataType: "text/html",
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
  {
    name: "tableCol",
    clipboardDataType: "text/html",
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
  {
    name: "tableAllCells",
    clipboardDataType: "text/html",
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
  // TODO: 2 tests below necessary?
  {
    name: "basicBlocks",
    clipboardDataType: "text/html",
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
  {
    name: "basicBlocksWithProps",
    clipboardDataType: "text/html",
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
];
