import { describe, it } from "vitest";

import { createTestEditor } from "../../setupTestEditor.js";
import { testSchema } from "../../testSchema.js";
import { copyPasteEqualityTestInstances } from "./copyPasteEqualityTestInstances.js";

// Tests for verifying that copying and pasting content in place within the
// editor results in the same document as the original. Used for as many cases
// as possible to ensure that converting to and from clipboard data does not
// result in any data loss.
describe("Copy/paste equality tests", () => {
  const getEditor = createTestEditor(testSchema);

  for (const { testCase, executeTest } of copyPasteEqualityTestInstances) {
    it(`${testCase.name}`, async () => {
      await executeTest(getEditor(), testCase);
    });
  }
});
