import { testExport } from "@blocknote/core";
import { describe, it } from "vitest";

import { setupTestEditor } from "../../setupTestEditor.js";
import { testSchema } from "../../testSchema.js";
import { getExportTestCases } from "./getExportTestCases.js";

describe("Export tests", () => {
  const getEditor = setupTestEditor(testSchema);

  for (const testCase of [
    ...getExportTestCases("blocknoteHTML"),
    ...getExportTestCases("html"),
  ]) {
    it(`${testCase.name}`, async () => {
      await testExport(getEditor(), testCase);
    });
  }
});
