import { describe, it } from "vitest";

import { setupTestEditor } from "../../setupTestEditor.js";
import { testSchema } from "../../testSchema.js";
import { copyPasteTestInstances } from "./copyPasteTestInstances.js";

// Tests for verifying that copying and pasting content within the editor works
// as expected. Used for specific cases where unexpected behaviour was noticed.
describe("Copy/paste tests", () => {
  const getEditor = setupTestEditor(testSchema);

  for (const { testCase, executeTest } of copyPasteTestInstances) {
    it(`${testCase.name}`, async () => {
      await executeTest(getEditor(), testCase);
    });
  }
});
