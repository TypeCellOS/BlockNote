import { describe, it } from "vitest";

import { setupTestEditor } from "../../setupTestEditor.js";
import { testSchema } from "../../testSchema.js";
import {
  exportTestInstancesBlockNoteHTML,
  exportTestInstancesHTML,
} from "./exportTestInstances.js";

describe("React export tests (BlockNote HTML)", () => {
  const getEditor = setupTestEditor(testSchema);

  for (const { testCase, executeTest } of exportTestInstancesBlockNoteHTML) {
    it(`${testCase.name}`, async () => {
      await executeTest(getEditor(), testCase);
    });
  }
});

describe("React export tests (HTML)", () => {
  const getEditor = setupTestEditor(testSchema);

  for (const { testCase, executeTest } of exportTestInstancesHTML) {
    it(`${testCase.name}`, async () => {
      await executeTest(getEditor(), testCase);
    });
  }
});
