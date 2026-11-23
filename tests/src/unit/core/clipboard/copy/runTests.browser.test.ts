import { describe } from "vite-plus/test";

import { testEditorOptions } from "../../testEditorOptions.js";
import { copyTestInstancesHTML } from "./copyTestInstances.js";

// Tests for verifying content that gets put on the clipboard when copying
// within the editor. Used for as many cases as possible to ensure each block or
// set of blocks is correctly converted into different types of clipboard data.
describe("Copy tests (HTML and Markdown)", () => {
  for (const { testCase, executeTest } of copyTestInstancesHTML) {
    it(`${testCase.name}`, async ({ setupEditor }) => {
      const { editor } = await setupEditor({
        mountType: "dom",
        ...testEditorOptions,
      });
      await executeTest(editor, testCase, { checkMarkdown: true });
    });
  }
});
