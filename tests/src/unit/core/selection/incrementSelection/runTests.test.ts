import { describe, it } from "vitest";

import { createTestEditor } from "../../createTestEditor.js";
import { testSchema } from "../../testSchema.js";
import {
  incrementSelectionTestInstancesEnd,
  incrementSelectionTestInstancesStart,
} from "./incrementSelectionTestInstances.js";

// Tests for getting the BlockNote selection while incrementing the ProseMirror
// selection to cover a wide range of cases.
describe("Increment selection tests (start)", () => {
  const getEditor = createTestEditor(testSchema);

  for (const {
    testCase,
    executeTest,
  } of incrementSelectionTestInstancesStart) {
    it(`${testCase.name}`, async () => {
      await executeTest(getEditor(), testCase);
    });
  }
});

describe("Increment selection tests (end)", () => {
  const getEditor = createTestEditor(testSchema);

  for (const { testCase, executeTest } of incrementSelectionTestInstancesEnd) {
    it(`${testCase.name}`, async () => {
      await executeTest(getEditor(), testCase);
    });
  }
});
