import { describe, it } from "vitest";

import {
  testExportBlockNoteHTML,
  testExportHTML,
} from "../../../shared/formatConversion/export/exportTestExecutors.js";
import { setupTestEditor } from "../../setupTestEditor.js";
import { testSchema } from "../../testSchema.js";
import { getExportTestInstances } from "./getExportTestInstances.js";

describe("React export tests", () => {
  const getEditor = setupTestEditor(testSchema);

  for (const { testCase, executeTest } of [
    ...getExportTestInstances(testExportBlockNoteHTML),
    ...getExportTestInstances(testExportHTML),
  ]) {
    it(`${testCase.name}`, async () => {
      await executeTest(getEditor(), testCase);
    });
  }
});
