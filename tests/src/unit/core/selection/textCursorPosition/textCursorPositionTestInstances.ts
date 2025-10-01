import {
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema,
} from "../../testSchema.js";
import { TextCursorPositionTestCase } from "../../../shared/selection/textCursorPosition/textCursorPositionTestCase.js";
import {
  testTextCursorPositionEnd,
  testTextCursorPositionPoint,
  testTextCursorPositionRange,
  testTextCursorPositionSetAndGet,
  testTextCursorPositionStart,
} from "../../../shared/selection/textCursorPosition/textCursorPositionTestExecutors.js";
import { TestInstance } from "../../../types.js";

export const getTextCursorPositionTestInstancesGetAndSet: TestInstance<
  TextCursorPositionTestCase<
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
          type: "paragraph",
          content: "Paragraph 1",
        },
        {
          id: "target",
          type: "paragraph",
          content: "Paragraph 2",
        },
        {
          type: "paragraph",
          content: "Paragraph 3",
        },
      ],
    },
    executeTest: testTextCursorPositionSetAndGet,
  },
  {
    testCase: {
      name: "noSiblings",
      document: [
        {
          id: "target",
          type: "paragraph",
          content: "Paragraph 1",
        },
      ],
    },
    executeTest: testTextCursorPositionSetAndGet,
  },
  {
    testCase: {
      name: "nested",
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
              id: "target",
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
    },
    executeTest: testTextCursorPositionSetAndGet,
  },
];

export const getTextCursorPositionTestInstancesStart: TestInstance<
  TextCursorPositionTestCase<
    TestBlockSchema,
    TestInlineContentSchema,
    TestStyleSchema
  >,
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema
>[] = [
  {
    testCase: getTextCursorPositionTestInstancesGetAndSet.find(
      (test) => test.testCase.name === "basic",
    )!.testCase,
    executeTest: testTextCursorPositionStart,
  },
];

export const getTextCursorPositionTestInstancesEnd: TestInstance<
  TextCursorPositionTestCase<
    TestBlockSchema,
    TestInlineContentSchema,
    TestStyleSchema
  >,
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema
>[] = [
  {
    testCase: getTextCursorPositionTestInstancesGetAndSet.find(
      (test) => test.testCase.name === "basic",
    )!.testCase,
    executeTest: testTextCursorPositionEnd,
  },
];

export const getTextCursorPositionTestInstancesPoint: TestInstance<
  TextCursorPositionTestCase<
    TestBlockSchema,
    TestInlineContentSchema,
    TestStyleSchema
  >,
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema
>[] = [
  {
    testCase: getTextCursorPositionTestInstancesGetAndSet.find(
      (test) => test.testCase.name === "basic",
    )!.testCase,
    executeTest: testTextCursorPositionPoint,
  },
];

export const getTextCursorPositionTestInstancesRange: TestInstance<
  TextCursorPositionTestCase<
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
      name: "range-same-block",
      document: [
        {
          type: "paragraph",
          content: "Paragraph 1",
        },
        {
          id: "target",
          type: "paragraph",
          content: "Paragraph 2",
        },
        {
          type: "paragraph",
          content: "Paragraph 3",
        },
      ],
      rangeConfig: {
        anchor: { id: "target", offset: 1 },
        head: { id: "target", offset: 3 },
      },
    },
    executeTest: testTextCursorPositionRange,
  },
  {
    testCase: {
      name: "range-adjacent-blocks",
      document: [
        {
          id: "block1",
          type: "paragraph",
          content: "First paragraph",
        },
        {
          id: "block2",
          type: "paragraph",
          content: "Second paragraph",
        },
        {
          type: "paragraph",
          content: "Third paragraph",
        },
      ],
      rangeConfig: {
        anchor: { id: "block1", offset: 5 },
        head: { id: "block2", offset: 6 },
      },
    },
    executeTest: testTextCursorPositionRange,
  },
  {
    testCase: {
      name: "range-multiple-blocks",
      document: [
        {
          id: "block1",
          type: "paragraph",
          content: "First paragraph",
        },
        {
          id: "block2",
          type: "paragraph",
          content: "Second paragraph",
        },
        {
          id: "block3",
          type: "paragraph",
          content: "Third paragraph",
        },
        {
          type: "paragraph",
          content: "Fourth paragraph",
        },
      ],
      rangeConfig: {
        anchor: { id: "block1", offset: 2 },
        head: { id: "block3", offset: 4 },
      },
    },
    executeTest: testTextCursorPositionRange,
  },
  {
    testCase: {
      name: "range-nested-blocks",
      document: [
        {
          type: "paragraph",
          content: "Parent paragraph",
          children: [
            {
              id: "nested1",
              type: "paragraph",
              content: "Nested paragraph 1",
            },
            {
              id: "nested2",
              type: "paragraph",
              content: "Nested paragraph 2",
            },
            {
              id: "nested3",
              type: "paragraph",
              content: "Nested paragraph 3",
            },
          ],
        },
        {
          type: "paragraph",
          content: "Sibling paragraph",
        },
      ],
      rangeConfig: {
        anchor: { id: "nested1", offset: 3 },
        head: { id: "nested3", offset: 5 },
      },
    },
    executeTest: testTextCursorPositionRange,
  },
  {
    testCase: {
      name: "range-cross-nesting-levels",
      document: [
        {
          id: "parent",
          type: "paragraph",
          content: "Parent paragraph",
          children: [
            {
              id: "nested",
              type: "paragraph",
              content: "Nested paragraph",
            },
          ],
        },
        {
          id: "sibling",
          type: "paragraph",
          content: "Sibling paragraph",
        },
      ],
      rangeConfig: {
        anchor: { id: "nested", offset: 2 },
        head: { id: "sibling", offset: 8 },
      },
    },
    executeTest: testTextCursorPositionRange,
  },
  {
    testCase: {
      name: "range-reverse-selection",
      document: [
        {
          id: "block1",
          type: "paragraph",
          content: "First paragraph",
        },
        {
          id: "block2",
          type: "paragraph",
          content: "Second paragraph",
        },
      ],
      rangeConfig: {
        anchor: { id: "block2", offset: 6 },
        head: { id: "block1", offset: 2 },
      },
    },
    executeTest: testTextCursorPositionRange,
  },
  {
    testCase: {
      name: "range-start-end-positions",
      document: [
        {
          id: "block1",
          type: "paragraph",
          content: "First paragraph",
        },
        {
          id: "block2",
          type: "paragraph",
          content: "Second paragraph",
        },
        {
          id: "block3",
          type: "paragraph",
          content: "Third paragraph",
        },
      ],
      rangeConfig: {
        anchor: { id: "block1", offset: 0 },
        head: { id: "block3", offset: 13 },
      },
    },
    executeTest: testTextCursorPositionRange,
  },
  {
    testCase: {
      name: "range-single-character-blocks",
      document: [
        {
          id: "block1",
          type: "paragraph",
          content: "A",
        },
        {
          id: "block2",
          type: "paragraph",
          content: "B",
        },
        {
          id: "block3",
          type: "paragraph",
          content: "C",
        },
      ],
      rangeConfig: {
        anchor: { id: "block1", offset: 0 },
        head: { id: "block3", offset: 1 },
      },
    },
    executeTest: testTextCursorPositionRange,
  },
];
