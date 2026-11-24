import {
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema,
} from "../../support/testSchema.js";
import { CopyPasteEqualityTestCase } from "./copyPasteEqualityTestCase.js";
import { testCopyPasteEquality } from "./copyPasteEqualityTestExecutors.js";
import { TestInstance } from "../../types.js";
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
>[] = copyTestInstancesHTML.map(({ testCase }) => ({
  testCase: {
    name: testCase.name,
    document: testCase.document,
    getCopyAndPasteSelection: testCase.getCopySelection,
  },
  executeTest: testCopyPasteEquality,
}));
