import { describe, it } from "vitest";

import { createTestEditor } from "../../createTestEditor.js";
import { testSchema } from "../../testSchema.js";
import { getSelectionTestInstancesRegular } from "./getSelectionTestInstances.js";

// Tests for getting the BlockNote selection from a given Prosemirror
// selection.
describe("Get selection tests", () => {
  const getEditor = createTestEditor(testSchema);

  for (const { testCase, executeTest } of getSelectionTestInstancesRegular) {
    it(`${testCase.name}`, async () => {
      await executeTest(getEditor(), testCase);
    });
  }
});
