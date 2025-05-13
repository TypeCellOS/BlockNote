import { describe, it } from "vitest";

import { setupTestEditor } from "../../setupTestEditor.js";
import { testSchema } from "../../testSchema.js";
import {
  moveSelectionTestInstancesEnd,
  moveSelectionTestInstancesStart,
} from "./moveSelectionTestInstances.js";

// Tests for verifying getting the BlockNote selection for a wide range of
// ProseMirror selections.
describe("Selection move tests (Start)", () => {
  const getEditor = setupTestEditor(testSchema);

  for (const { testCase, executeTest } of moveSelectionTestInstancesStart) {
    it(`${testCase.name}`, async () => {
      await executeTest(getEditor(), testCase);
    });
  }
});

describe("Selection move tests (End)", () => {
  const getEditor = setupTestEditor(testSchema);

  for (const { testCase, executeTest } of moveSelectionTestInstancesEnd) {
    it(`${testCase.name}`, async () => {
      await executeTest(getEditor(), testCase);
    });
  }
});
