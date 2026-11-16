import {
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema,
} from "../../testSchema.js";
import { CopyPasteEqualityTestCase } from "../../../shared/clipboard/copyPasteEquality/copyPasteEqualityTestCase.js";
import { testCopyPasteEquality } from "../../../shared/clipboard/copyPasteEquality/copyPasteEqualityTestExecutors.js";
import { TestInstance } from "../../../types.js";
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
    // These selections start in the first parent's children and end in the
    // following parent. The selected forest now stays at the starting depth
    // instead of restoring the unselected ancestor boundary on paste.
    getExpectedDocument:
      testCase.name === "childrenToNextParent" ||
      testCase.name === "childrenToNextParentsChildren"
        ? ([parent, nextParent]) => [
            { ...parent, children: [...parent.children, nextParent] },
          ]
        : undefined,
  },
  executeTest: testCopyPasteEquality,
}));
