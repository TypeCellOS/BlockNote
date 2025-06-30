import { describe, it } from "vitest";

import { createTestEditor } from "../../createTestEditor.js";
import { testSchema } from "../../testSchema.js";
import {
  exportTestInstancesBlockNoteHTML,
  exportTestInstancesHTML,
} from "./exportTestInstances.js";

describe("React export tests (BlockNote HTML)", () => {
  const getEditor = createTestEditor(testSchema);

  for (const { testCase, executeTest } of exportTestInstancesBlockNoteHTML) {
    it(`${testCase.name}`, async () => {
      await executeTest(getEditor(), testCase);
    });
  }
});

describe("React export tests (HTML)", () => {
  const getEditor = createTestEditor(testSchema);

  for (const { testCase, executeTest } of exportTestInstancesHTML) {
    it(`${testCase.name}`, async () => {
      await executeTest(getEditor(), testCase);
    });
  }
});
