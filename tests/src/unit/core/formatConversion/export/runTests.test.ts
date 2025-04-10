import { describe, it } from "vitest";

import {
  testExportBlockNoteHTML,
  testExportHTML,
  testExportMarkdown,
  testExportNodes,
} from "../../../shared/formatConversion/export/exportTestExecutors.js";
import { setupTestEditor } from "../../setupTestEditor.js";
import { testSchema } from "../../testSchema.js";
import { getExportTestInstances } from "./getExportTestInstances.js";

// Tests for verifying that exporting blocks to other formats works as expected.
// Used broadly to ensure each block or set of blocks is correctly converted
// into different formats.
describe("Export tests", () => {
  const getEditor = setupTestEditor(testSchema);

  for (const { testCase, executeTest } of [
    ...getExportTestInstances(testExportBlockNoteHTML),
    ...getExportTestInstances(testExportHTML),
    ...getExportTestInstances(testExportMarkdown),
    ...getExportTestInstances(testExportNodes),
  ]) {
    it(`${testCase.name}`, async () => {
      await executeTest(getEditor(), testCase);
    });
  }
});
