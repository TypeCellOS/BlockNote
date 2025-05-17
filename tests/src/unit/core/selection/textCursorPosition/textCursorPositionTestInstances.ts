import {
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema,
} from "../../testSchema.js";
import { TextCursorPositionTestCase } from "../../../shared/selection/textCursorPosition/textCursorPositionTestCase.js";
import {
  testTextCursorPositionEnd,
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
