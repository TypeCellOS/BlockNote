import { describe, it } from "vitest";

import { createTestEditor } from "../../createTestEditor.js";
import { testSchema } from "../../testSchema.js";
import {
  getSelectionTestInstancesRegular,
  getSelectionTestInstancesCutblocks,
} from "./getSelectionTestInstances.js";

// Tests for getting the BlockNote selection from a given Prosemirror
// selection.
describe("Get selection tests (regular)", () => {
  const getEditor = createTestEditor(testSchema);

  for (const { testCase, executeTest } of getSelectionTestInstancesRegular) {
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
