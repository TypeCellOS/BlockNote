import { describe } from "vite-plus/test";

import { testEditorOptions } from "../../support/testEditorOptions.js";
import { copyPasteTestInstances } from "./copyPasteTestInstances.js";

// Tests for verifying that copying and pasting content within the editor works
// as expected. Used for specific cases where unexpected behaviour was noticed.
describe("Copy/paste tests", () => {
  for (const { testCase, executeTest } of copyPasteTestInstances) {
    it(`${testCase.name}`, async ({ setupEditor }) => {
      const { editor } = await setupEditor({
        mountType: "dom",
        ...testEditorOptions,
      });
      await executeTest(editor, testCase);
    });
  }
});
