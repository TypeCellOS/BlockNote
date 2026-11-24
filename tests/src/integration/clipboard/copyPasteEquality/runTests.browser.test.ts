import { describe } from "vite-plus/test";

import { testEditorOptions } from "../../support/testEditorOptions.js";
import { copyPasteEqualityTestInstances } from "./copyPasteEqualityTestInstances.js";

// Tests for verifying that copying and pasting content in place within the
// editor results in the same document as the original. Used for as many cases
// as possible to ensure that converting to and from clipboard data does not
// result in any data loss.
describe("Copy/paste equality tests", () => {
  for (const { testCase, executeTest } of copyPasteEqualityTestInstances) {
    it(`${testCase.name}`, async ({ setupEditor }) => {
      const { editor } = await setupEditor({
        mountType: "dom",
        ...testEditorOptions,
      });
      await executeTest(editor, testCase);
    });
  }
});
