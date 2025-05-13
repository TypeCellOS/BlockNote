import { describe, it } from "vitest";

import { createTestEditor } from "../../setupTestEditor.js";
import { testSchema } from "../../testSchema.js";
import {
  getSelectionTestInstances,
  getSelectionTestInstancesCutblocks,
} from "./getSelectionTestInstances.js";

// Tests for getting the BlockNote selection from a given Prosemirror
// selection.
describe("Get selection tests", () => {
  const getEditor = createTestEditor(testSchema);

  for (const { testCase, executeTest } of getSelectionTestInstances) {
    it(`${testCase.name}`, async () => {
      await executeTest(getEditor(), testCase);
    });
  }
});

describe("Get selection tests (cut blocks)", () => {
  const getEditor = createTestEditor(testSchema);

  for (const { testCase, executeTest } of getSelectionTestInstancesCutblocks) {
    it(`${testCase.name}`, async () => {
      await executeTest(getEditor(), testCase);
    });
  }
});
