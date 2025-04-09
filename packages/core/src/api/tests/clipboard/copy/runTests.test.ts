import { describe, it } from "vitest";

import { setupTestEditor } from "../../setupTestEditor.js";
import { testSchema } from "../../testSchema.js";
import { getCopyTestInstances } from "./getCopyTestInstances.js";

// Tests for verifying content that gets put on the clipboard when copying
// within the editor. Used broadly to ensure each block or set of blocks is correctly
// converted into different types of clipboard data.
describe("Copy tests", () => {
  const getEditor = setupTestEditor(testSchema);

  for (const { testCase, executeTest } of getCopyTestInstances()) {
    it(`${testCase.name}`, async () => {
      await executeTest(getEditor(), testCase);
    });
  }
});
