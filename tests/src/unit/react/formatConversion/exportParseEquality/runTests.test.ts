import { describe, it } from "vitest";

import { setupTestEditor } from "../../setupTestEditor.js";
import { testSchema } from "../../testSchema.js";
import {
  exportParseEqualityTestInstancesBlockNoteHTML,
  exportParseEqualityTestInstancesNodes,
} from "./exportParseEqualityTestInstances.js";

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

describe("Export/parse equality tests (TipTap nodes)", () => {
  const getEditor = setupTestEditor(testSchema);

  for (const {
    testCase,
    executeTest,
  } of exportParseEqualityTestInstancesNodes) {
    it(`${testCase.name}`, async () => {
      await executeTest(getEditor(), testCase);
    });
  }
});
