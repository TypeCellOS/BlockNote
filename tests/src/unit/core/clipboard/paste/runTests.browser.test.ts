import { describe } from "vite-plus/test";

import { testEditorOptions } from "../../testEditorOptions.js";
import {
  pasteTestInstancesHTML,
  pasteTestInstancesMarkdown,
} from "./pasteTestInstances.js";

// Tests for verifying that clipboard data gets pasted into the editor properly.
// Used for specific cases for when content from outside the editor is pasted
// into it. This includes content from other editors, as well as content from
// the web that has produced bugs in the past.
describe("Paste tests (HTML)", () => {
  for (const { testCase, executeTest } of pasteTestInstancesHTML) {
    it(`${testCase.name}`, async ({ setupEditor }) => {
      const { editor } = await setupEditor({
        mountType: "dom",
        ...testEditorOptions,
      });
      await executeTest(editor, testCase);
    });
  }
});

describe("Paste tests (Markdown)", () => {
  for (const { testCase, executeTest } of pasteTestInstancesMarkdown) {
    it(`${testCase.name}`, async ({ setupEditor }) => {
      const { editor } = await setupEditor({
        mountType: "dom",
        ...testEditorOptions,
      });
      await executeTest(editor, testCase);
    });
  }
});
