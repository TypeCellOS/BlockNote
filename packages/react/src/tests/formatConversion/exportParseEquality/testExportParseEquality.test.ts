import { testExportParseEquality } from "@blocknote/core";
import { describe, it } from "vitest";

import { setupTestEditor } from "../../setupTestEditor.js";
import { testSchema } from "../../testSchema.js";
import { getExportParseEqualityTestCases } from "./getExportParseEqualityTestCases.js";

describe("Export/parse equality tests", () => {
  const getEditor = setupTestEditor(testSchema);

  for (const testCase of [
    ...getExportParseEqualityTestCases("blocknoteHTML"),
    ...getExportParseEqualityTestCases("nodes"),
  ]) {
    it(`${testCase.name}`, async () => {
      await testExportParseEquality(getEditor(), testCase);
    });
  }
});
