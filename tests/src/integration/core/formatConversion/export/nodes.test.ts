import { describe } from "vite-plus/test";
import type {} from "../../../../../vitestSetup.node-fixtures.js";

import { useFileTestEditor } from "../../testEditorOptions.js";
import { testExportNodes } from "../../../shared/formatConversion/export/exportTestExecutors.js";
import { exportCases } from "./exportTestInstances.js";

// Node conversion uses the editor's schema without changing its state.
const it = useFileTestEditor();

describe("Export tests (TipTap nodes)", () => {
  for (const testCase of exportCases) {
    it(`${testCase.name}`, async ({ editor }) => {
      await testExportNodes(editor, testCase);
    });
  }
});
