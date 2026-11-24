import { CopyPasteEqualityTestCase } from "./copyPasteEqualityTestCase.js";
import { testCopyPasteEquality } from "./copyPasteEqualityTestExecutors.js";
import { TestInstance } from "../../types.js";
import {
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema,
} from "../../support/reactTestSchema.js";
import { copyTestInstancesHTML } from "../copy/customBlockCopyTestInstances.js";

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
