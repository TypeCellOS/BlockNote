import { describe, it } from "vitest";

import { setupTestEditor } from "../../setupTestEditor.js";
import { testSchema } from "../../testSchema.js";
import {
  testExportParseEqualityBlockNoteHTML,
  testExportParseEqualityNodes,
} from "../../../shared/formatConversion/exportParseEquality/exportParseEqualityTestExecutors.js";
import { getExportParseEqualityTestInstances } from "./getExportParseEqualityTestInstances.js";

// Tests for verifying that exporting blocks to another format, then importing
// them back results in the same blocks as the original. Used broadly to ensure
// that exporting and importing blocks does not result in any data loss.
describe("Export/parse equality tests", () => {
  const getEditor = setupTestEditor(testSchema);

  for (const { testCase, executeTest } of [
    ...getExportParseEqualityTestInstances(
      testExportParseEqualityBlockNoteHTML
    ),
    ...getExportParseEqualityTestInstances(testExportParseEqualityNodes),
  ]) {
    it(`${testCase.name}`, async () => {
      await executeTest(getEditor(), testCase);
    });
  }
});
