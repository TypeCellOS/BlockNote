import { describe, it } from "vitest";

import { setupTestEditor } from "../../setupTestEditor.js";
import { testSchema } from "../../testSchema.js";
import {
  exportParseEqualityTestInstancesBlockNoteHTML,
  exportParseEqualityTestInstancesHTML,
} from "./exportParseEqualityTestInstances.js";

// Tests for verifying that exporting blocks to another format, then importing
// them back results in the same blocks as the original. Used for as many cases
// as possible to ensure that exporting and importing blocks does not result in
// any data loss.
describe("Export/parse equality tests (BlockNote HTML)", () => {
  const getEditor = setupTestEditor(testSchema);

  for (const {
    testCase,
    executeTest,
  } of exportParseEqualityTestInstancesBlockNoteHTML) {
    it(`${testCase.name}`, async () => {
      await executeTest(getEditor(), testCase);
    });
  }
});

describe("Export/parse equality tests (HTML)", () => {
  const getEditor = setupTestEditor(testSchema);

  for (const {
    testCase,
    executeTest,
  } of exportParseEqualityTestInstancesHTML) {
    it(`${testCase.name}`, async () => {
      await executeTest(getEditor(), testCase);
    });
  }
});
