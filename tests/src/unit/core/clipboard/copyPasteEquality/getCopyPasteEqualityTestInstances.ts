import {
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema,
} from "../../testSchema.js";
import { CopyPasteEqualityTestCase } from "../../../shared/clipboard/copyPasteEquality/copyPasteEqualityTestCase.js";
import { testCopyPasteEquality } from "../../../shared/clipboard/copyPasteEquality/copyPasteEqualityTestExecutors.js";
import { TestInstance } from "../../../types.js";
import { getCopyTestInstances } from "../copy/getCopyTestInstances.js";

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
