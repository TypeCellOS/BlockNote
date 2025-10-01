import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import { CellSelection } from "@tiptap/pm/tables";

import {
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema,
} from "../../testSchema.js";
import { GetSelectionTestCase } from "../../../shared/selection/getSelection/getSelectionTestCase.js";
import { testGetSelectionRegular } from "../../../shared/selection/getSelection/getSelectionTestExecutors.js";
import {
  getPosOfTableCellNode,
  getPosOfTextNode,
} from "../../../shared/testUtil.js";
import { TestInstance } from "../../../types.js";

export const getSelectionTestInstancesRegular: TestInstance<
  GetSelectionTestCase<
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
      name: "singleBlock",
      document: [
        {
          type: "paragraph",
          content: "Paragraph 1",
        },
      ],
      getSelection: (doc) => {
        const startPos = getPosOfTextNode(doc, "Paragraph 1");
        const endPos = getPosOfTextNode(doc, "Paragraph 1", true);

        return TextSelection.create(doc, startPos, endPos);
      },
    },
    executeTest: testGetSelectionRegular,
  },

  {
    testCase: {
      name: "multipleBlocks",
      document: [
        {
          type: "paragraph",
          content: "Paragraph 1",
        },
        {
          type: "paragraph",
          content: "Paragraph 2",
        },
      ],
      getSelection: (doc) => {
        const startPos = getPosOfTextNode(doc, "Paragraph 1");
        const endPos = getPosOfTextNode(doc, "Paragraph 2", true);

        return TextSelection.create(doc, startPos, endPos);
      },
    },
    executeTest: testGetSelectionRegular,
  },
  {
    testCase: {
      name: "childBlock",
      document: [
        {
          type: "paragraph",
          content: "Paragraph 1",
          children: [
            {
              type: "paragraph",
              content: "Nested Paragraph 1",
            },
          ],
        },
      ],
      getSelection: (doc) => {
        const startPos = getPosOfTextNode(doc, "Nested Paragraph 1");
        const endPos = getPosOfTextNode(doc, "Nested Paragraph 1", true);

        return TextSelection.create(doc, startPos, endPos);
      },
    },
    executeTest: testGetSelectionRegular,
  },
  {
    testCase: {
      name: "multipleChildBlocks",
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
          ],
        },
      ],
      getSelection: (doc) => {
        const startPos = getPosOfTextNode(doc, "Nested Paragraph 1");
        const endPos = getPosOfTextNode(doc, "Nested Paragraph 2", true);

        return TextSelection.create(doc, startPos, endPos);
      },
    },
    executeTest: testGetSelectionRegular,
  },
  {
    testCase: {
      name: "parentToChildBlock",
      document: [
        {
          type: "paragraph",
          content: "Paragraph 1",
          children: [
            {
              type: "paragraph",
              content: "Nested Paragraph 1",
            },
          ],
        },
      ],
      getSelection: (doc) => {
        const startPos = getPosOfTextNode(doc, "Paragraph 1");
        const endPos = getPosOfTextNode(doc, "Nested Paragraph 1", true);

        return TextSelection.create(doc, startPos, endPos);
      },
    },
    executeTest: testGetSelectionRegular,
  },
  {
    testCase: {
      name: "childToNextParentBlock",
      document: [
        {
          type: "paragraph",
          content: "Paragraph 1",
          children: [
            {
              type: "paragraph",
              content: "Nested Paragraph 1",
            },
          ],
        },
        {
          type: "paragraph",
          content: "Paragraph 2",
        },
      ],
      getSelection: (doc) => {
        const startPos = getPosOfTextNode(doc, "Nested Paragraph 1");
        const endPos = getPosOfTextNode(doc, "Paragraph 2", true);

        return TextSelection.create(doc, startPos, endPos);
      },
    },
    executeTest: testGetSelectionRegular,
  },
  {
    testCase: {
      name: "childToNextParentsChildBlock",
      document: [
        {
          type: "paragraph",
          content: "Paragraph 1",
          children: [
            {
              type: "paragraph",
              content: "Nested Paragraph 1",
            },
          ],
        },
        {
          type: "paragraph",
          content: "Paragraph 2",
          children: [
            {
              type: "paragraph",
              content: "Nested Paragraph 2",
            },
          ],
        },
      ],
      getSelection: (doc) => {
        const startPos = getPosOfTextNode(doc, "Nested Paragraph 1");
        const endPos = getPosOfTextNode(doc, "Nested Paragraph 2", true);

        return TextSelection.create(doc, startPos, endPos);
      },
    },
    executeTest: testGetSelectionRegular,
  },
  {
    testCase: {
      name: "acrossBlockWithChildren",
      document: [
        {
          type: "paragraph",
          content: "Paragraph 1",
        },
        {
          type: "paragraph",
          content: "Paragraph 2",
          children: [
            {
              type: "paragraph",
              content: "Nested Paragraph 1",
            },
          ],
        },
        {
          type: "paragraph",
          content: "Paragraph 3",
        },
      ],
      getSelection: (doc) => {
        const startPos = getPosOfTextNode(doc, "Paragraph 1");
        const endPos = getPosOfTextNode(doc, "Paragraph 3", true);

        return TextSelection.create(doc, startPos, endPos);
      },
    },
    executeTest: testGetSelectionRegular,
  },
  {
    testCase: {
      name: "blockWithoutContent",
      document: [
        {
          type: "image",
          props: {
            url: "https://ralfvanveen.com/wp-content/uploads/2021/06/Placeholder-_-Glossary.svg",
          },
        },
      ],
      getSelection: (doc) => {
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
    executeTest: testGetSelectionRegular,
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
      getSelection: (doc) => {
        const startPos = getPosOfTableCellNode(doc, "Table Cell 1");

        return CellSelection.create(doc, startPos);
      },
    },
    executeTest: testGetSelectionRegular,
  },
  {
    testCase: {
      name: "multipleTableCells",
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
      getSelection: (doc) => {
        const startPos = getPosOfTableCellNode(doc, "Table Cell 1");
        const endPos = getPosOfTableCellNode(doc, "Table Cell 4");

        return CellSelection.create(doc, startPos, endPos);
      },
    },
    executeTest: testGetSelectionRegular,
  },
  {
    testCase: {
      name: "tableBlock",
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
      getSelection: (doc) => {
        const startPos = getPosOfTextNode(doc, "Table Cell 1");
        const endPos = getPosOfTextNode(doc, "Table Cell 4", true);

        return TextSelection.create(doc, startPos, endPos);
      },
    },
    executeTest: testGetSelectionRegular,
  },
  {
    testCase: {
      name: "multipleTableBlocks",
      document: [
        {
          type: "table",
          content: {
            type: "tableContent",
            rows: [
              {
                cells: [["First Table Cell 1"], ["First Table Cell 2"]],
              },
              {
                cells: [["First Table Cell 3"], ["First Table Cell 4"]],
              },
            ],
          },
        },
        {
          type: "table",
          content: {
            type: "tableContent",
            rows: [
              {
                cells: [["Second Table Cell 1"], ["Second Table Cell 2"]],
              },
              {
                cells: [["Second Table Cell 3"], ["Second Table Cell 4"]],
              },
            ],
          },
        },
      ],
      getSelection: (doc) => {
        const startPos = getPosOfTextNode(doc, "First Table Cell 1");
        const endPos = getPosOfTextNode(doc, "Second Table Cell 4", true);

        return TextSelection.create(doc, startPos, endPos);
      },
    },
    executeTest: testGetSelectionRegular,
  },
  {
    testCase: {
      name: "singleBlockWithOffsets",
      document: [
        {
          type: "paragraph",
          content: "Paragraph 1",
        },
      ],
      getSelection: (doc) => {
        const startPos = getPosOfTextNode(doc, "Paragraph 1");
        const endPos = getPosOfTextNode(doc, "Paragraph 1", true);

        return TextSelection.create(doc, startPos + 1, endPos - 1);
      },
    },
    executeTest: testGetSelectionRegular,
  },
  {
    testCase: {
      name: "multipleBlocksWithOffsets",
      document: [
        {
          type: "paragraph",
          content: "Paragraph 1",
        },
        {
          type: "paragraph",
          content: "Paragraph 2",
        },
      ],
      getSelection: (doc) => {
        const startPos = getPosOfTextNode(doc, "Paragraph 1");
        const endPos = getPosOfTextNode(doc, "Paragraph 2", true);

        return TextSelection.create(doc, startPos + 1, endPos - 1);
      },
    },
    executeTest: testGetSelectionRegular,
  },
  {
    testCase: {
      name: "childBlockWithOffsets",
      document: [
        {
          type: "paragraph",
          content: "Paragraph 1",
          children: [
            {
              type: "paragraph",
              content: "Nested Paragraph 1",
            },
          ],
        },
      ],
      getSelection: (doc) => {
        const startPos = getPosOfTextNode(doc, "Nested Paragraph 1");
        const endPos = getPosOfTextNode(doc, "Nested Paragraph 1", true);

        return TextSelection.create(doc, startPos + 1, endPos - 1);
      },
    },
    executeTest: testGetSelectionRegular,
  },
  {
    testCase: {
      name: "multipleChildBlocksWithOffsets",
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
          ],
        },
      ],
      getSelection: (doc) => {
        const startPos = getPosOfTextNode(doc, "Nested Paragraph 1");
        const endPos = getPosOfTextNode(doc, "Nested Paragraph 2", true);

        return TextSelection.create(doc, startPos + 1, endPos - 1);
      },
    },
    executeTest: testGetSelectionRegular,
  },
  {
    testCase: {
      name: "parentToChildBlockWithOffsets",
      document: [
        {
          type: "paragraph",
          content: "Paragraph 1",
          children: [
            {
              type: "paragraph",
              content: "Nested Paragraph 1",
            },
          ],
        },
      ],
      getSelection: (doc) => {
        const startPos = getPosOfTextNode(doc, "Paragraph 1");
        const endPos = getPosOfTextNode(doc, "Nested Paragraph 1", true);

        return TextSelection.create(doc, startPos + 1, endPos - 1);
      },
    },
    executeTest: testGetSelectionRegular,
  },
  {
    testCase: {
      name: "childToNextParentBlockWithOffsets",
      document: [
        {
          type: "paragraph",
          content: "Paragraph 1",
          children: [
            {
              type: "paragraph",
              content: "Nested Paragraph 1",
            },
          ],
        },
        {
          type: "paragraph",
          content: "Paragraph 2",
        },
      ],
      getSelection: (doc) => {
        const startPos = getPosOfTextNode(doc, "Nested Paragraph 1");
        const endPos = getPosOfTextNode(doc, "Paragraph 2", true);

        return TextSelection.create(doc, startPos + 1, endPos - 1);
      },
    },
    executeTest: testGetSelectionRegular,
  },
  {
    testCase: {
      name: "childToNextParentsChildBlockWithOffsets",
      document: [
        {
          type: "paragraph",
          content: "Paragraph 1",
          children: [
            {
              type: "paragraph",
              content: "Nested Paragraph 1",
            },
          ],
        },
        {
          type: "paragraph",
          content: "Paragraph 2",
          children: [
            {
              type: "paragraph",
              content: "Nested Paragraph 2",
            },
          ],
        },
      ],
      getSelection: (doc) => {
        const startPos = getPosOfTextNode(doc, "Nested Paragraph 1");
        const endPos = getPosOfTextNode(doc, "Nested Paragraph 2", true);

        return TextSelection.create(doc, startPos + 1, endPos - 1);
      },
    },
    executeTest: testGetSelectionRegular,
  },
  {
    testCase: {
      name: "tableBlockWithOffsets",
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
      getSelection: (doc) => {
        const startPos = getPosOfTextNode(doc, "Table Cell 1");
        const endPos = getPosOfTextNode(doc, "Table Cell 4", true);

        return TextSelection.create(doc, startPos + 1, endPos - 1);
      },
    },
    executeTest: testGetSelectionRegular,
  },
  {
    testCase: {
      name: "multipleTableBlocksWithOffsets",
      document: [
        {
          type: "table",
          content: {
            type: "tableContent",
            rows: [
              {
                cells: [["First Table Cell 1"], ["First Table Cell 2"]],
              },
              {
                cells: [["First Table Cell 3"], ["First Table Cell 4"]],
              },
            ],
          },
        },
        {
          type: "table",
          content: {
            type: "tableContent",
            rows: [
              {
                cells: [["Second Table Cell 1"], ["Second Table Cell 2"]],
              },
              {
                cells: [["Second Table Cell 3"], ["Second Table Cell 4"]],
              },
            ],
          },
        },
      ],
      getSelection: (doc) => {
        const startPos = getPosOfTextNode(doc, "First Table Cell 3");
        const endPos = getPosOfTextNode(doc, "Second Table Cell 2", true);

        return TextSelection.create(doc, startPos + 1, endPos - 1);
      },
    },
    executeTest: testGetSelectionRegular,
  },
];
