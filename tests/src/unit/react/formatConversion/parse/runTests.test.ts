import { describe, it } from "vite-plus/test";

import { setupTestEditor } from "../../setupTestEditor.js";
import { testSchema } from "../../testSchema.js";
import { parseTestInstancesHTML } from "./parseTestInstances.js";

// Tests for verifying that the React math block and inline math implementations
// are correctly parsed from external HTML (MathML).
describe("React parse tests (HTML)", () => {
  const getEditor = setupTestEditor(testSchema);

  for (const { testCase, executeTest } of parseTestInstancesHTML) {
    it(`${testCase.name}`, async () => {
      await executeTest(getEditor(), testCase);
    });
  }
});
