import { describe, it } from "vitest";

import {
  testExportParseEqualityBlockNoteHTML,
  testExportParseEqualityNodes,
} from "../../../shared/formatConversion/exportParseEquality/exportParseEqualityTestExecutors.js";
import { setupTestEditor } from "../../setupTestEditor.js";
import { testSchema } from "../../testSchema.js";
import { getExportParseEqualityTestInstances } from "./getExportParseEqualityTestInstances.js";

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
