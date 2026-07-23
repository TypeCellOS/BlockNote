import { CopyPasteEqualityTestCase } from "../../../shared/clipboard/copyPasteEquality/copyPasteEqualityTestCase.js";
import { testCopyPasteEquality } from "../../../shared/clipboard/copyPasteEquality/copyPasteEqualityTestExecutors.js";
import { TestInstance } from "../../../types.js";
import {
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema,
} from "../../testSchema.js";
import { copyTestInstancesHTML } from "../copy/copyTestInstances.js";

// NOTE: Only the block is covered in these tests. Inline `<math>` is foreign (non-HTML) content,
// and ProseMirror's clipboard parser in the jsdom unit environment doesn't run the inline
// content's `parseContent` for it, so pasting the copied inline math doubles its source here. It
// round-trips correctly in a real browser and should be covered by the browser-mode e2e suite
// instead.
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
