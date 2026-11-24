import { describe } from "vite-plus/test";

import { testEditorOptions } from "../../support/reactTestEditorOptions.js";
import { copyTestInstancesHTML } from "./customBlockCopyTestInstances.js";

describe("React copy tests (HTML)", () => {
  for (const { testCase, executeTest } of copyTestInstancesHTML) {
    it(`${testCase.name}`, async ({ setupEditor }) => {
      const { editor } = await setupEditor(testEditorOptions);
      await executeTest(editor, testCase);
    });
  }
});
