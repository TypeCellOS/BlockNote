import {
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema,
} from "../../testSchema.js";
import { TestInstance } from "../../types.js";
import { getCopyTestInstances } from "../copy/getCopyTestInstances.js";
import { CopyPasteEqualityTestCase } from "./copyPasteEqualityTestCase.js";
import { testCopyPasteEquality } from "./copyPasteEqualityTestExecutors.js";

export const getCopyPasteEqualityTestInstances = (): TestInstance<
  CopyPasteEqualityTestCase<
    TestBlockSchema,
    TestInlineContentSchema,
    TestStyleSchema
  >,
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema
>[] =>
  getCopyTestInstances().map(({ testCase }) => ({
    testCase: {
      name: testCase.name,
      document: testCase.document,
      getCopyAndPasteSelection: testCase.getCopySelection,
    },
    executeTest: testCopyPasteEquality,
  }));
