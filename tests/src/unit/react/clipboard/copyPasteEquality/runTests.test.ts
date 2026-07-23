import { describe, it } from "vite-plus/test";

import { setupTestEditor } from "../../setupTestEditor.js";
import { testSchema } from "../../testSchema.js";
import { copyPasteEqualityTestInstances } from "./copyPasteEqualityTestInstances.js";

describe("React copy/paste equality tests", () => {
  const getEditor = setupTestEditor(testSchema);

  for (const { testCase, executeTest } of copyPasteEqualityTestInstances) {
    it(`${testCase.name}`, async () => {
      await executeTest(getEditor(), testCase);
    });
  }
});
