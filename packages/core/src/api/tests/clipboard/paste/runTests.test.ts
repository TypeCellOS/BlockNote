import { describe, it } from "vitest";

import { setupTestEditor } from "../../setupTestEditor.js";
import { testSchema } from "../../testSchema.js";
import { getPasteTestInstances } from "./getPasteTestInstances.js";

// Tests for verifying that clipboard data gets pasted into the editor properly.
// Used for specific cases for when content from outside the editor is pasted
// into it. This includes content from other editors, as well as content from
// the web that has produced bugs in the past.
describe("Paste tests", () => {
  const getEditor = setupTestEditor(testSchema);

  for (const { testCase, executeTest } of getPasteTestInstances()) {
    it(`${testCase.name}`, async () => {
      await executeTest(getEditor(), testCase);
    });
  }
});
