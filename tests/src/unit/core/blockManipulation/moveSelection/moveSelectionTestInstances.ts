import {
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema,
} from "../../testSchema.js";
import { MoveSelectionTestCase } from "../../../shared/blockManipulation/moveSelection/moveSelectionTestCase.js";
import {
  testMoveSelectionEnd,
  testMoveSelectionStart,
} from "../../../shared/blockManipulation/moveSelection/moveSelectionTestExecutors.js";
import { TestInstance } from "../../../types.js";

export const moveSelectionTestInstancesStart: TestInstance<
  MoveSelectionTestCase<
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
      name: "basic",
      document: [
        {
          type: "heading",
          props: {
            level: 2,
            textColor: "red",
          },
          content: "Heading 1",
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
          type: "heading",
          props: {
            level: 2,
            textColor: "red",
          },
          content: "Heading 2",
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
          type: "heading",
          props: {
            level: 2,
            textColor: "red",
          },
          content: [
            {
              type: "text",
              text: "Bold",
              styles: {
                bold: true,
              },
            },
            {
              type: "text",
              text: "Italic",
              styles: {
                italic: true,
              },
            },
            {
              type: "text",
              text: "Regular",
              styles: {},
            },
          ],
          children: [
            {
              type: "image",
              props: {
                url: "https://ralfvanveen.com/wp-content/uploads/2021/06/Placeholder-_-Glossary.svg",
              },
              children: [
                {
                  type: "paragraph",
                  content: "Nested Paragraph",
                },
              ],
            },
          ],
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
          // Not needed as selections starting in table cells will get snapped to
          // the table boundaries.
          // children: [
          //   {
          //     type: "table",
          //     content: {
          //       type: "tableContent",
          //       rows: [
          //         {
          //           cells: ["Table Cell", "Table Cell"],
          //         },
          //         {
          //           cells: ["Table Cell", "Table Cell"],
          //         },
          //       ],
          //     },
          //   },
          // ],
        },
      ],
    },
    executeTest: testMoveSelectionStart,
  },
];

export const moveSelectionTestInstancesEnd: TestInstance<
  MoveSelectionTestCase<
    TestBlockSchema,
    TestInlineContentSchema,
    TestStyleSchema
  >,
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema
>[] = moveSelectionTestInstancesStart.map(({ testCase }) => ({
  testCase,
  executeTest: testMoveSelectionEnd,
}));
