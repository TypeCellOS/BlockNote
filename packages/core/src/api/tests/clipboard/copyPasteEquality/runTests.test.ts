import { describe, it } from "vitest";

import { setupTestEditor } from "../../setupTestEditor.js";
import { testSchema } from "../../testSchema.js";
import { getCopyPasteEqualityTestInstances } from "./getCopyPasteEqualityTestInstances.js";

// Tests for verifying that copying and pasting content in place within the
// editor results in the same document as the original. Used broadly to ensure
// that converting to and from clipboard data does not result in any data loss.
describe("Copy/paste equality tests", () => {
  const getEditor = setupTestEditor(testSchema);

  for (const { testCase, executeTest } of getCopyPasteEqualityTestInstances()) {
    it(`${testCase.name}`, async () => {
      await executeTest(getEditor(), testCase);
    });
  }
});
