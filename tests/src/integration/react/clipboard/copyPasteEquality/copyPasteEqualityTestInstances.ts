import { CopyPasteEqualityTestCase } from "../../../shared/clipboard/copyPasteEquality/copyPasteEqualityTestCase.js";
import { testCopyPasteEquality } from "../../../shared/clipboard/copyPasteEquality/copyPasteEqualityTestExecutors.js";
import { TestInstance } from "../../../types.js";
import {
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema,
} from "../../testSchema.js";
import { copyTestInstancesHTML } from "../copy/copyTestInstances.js";

export const copyPasteEqualityTestInstances: TestInstance<
  CopyPasteEqualityTestCase<
    TestBlockSchema,
    TestInlineContentSchema,
    TestStyleSchema
  >,
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema
>[] = copyTestInstancesHTML
  .filter(({ testCase }) => testCase.name === "mathBlock")
  .map(({ testCase }) => ({
    testCase: {
      name: testCase.name,
      document: testCase.document,
      getCopyAndPasteSelection: testCase.getCopySelection,
    },
    executeTest: testCopyPasteEquality,
  }));
