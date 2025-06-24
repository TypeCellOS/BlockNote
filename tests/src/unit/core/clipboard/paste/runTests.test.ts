import { describe, it } from "vitest";

import { createTestEditor } from "../../createTestEditor.js";
import { testSchema } from "../../testSchema.js";
import {
  pasteTestInstancesHTML,
  pasteTestInstancesMarkdown,
} from "./pasteTestInstances.js";

// Tests for verifying that clipboard data gets pasted into the editor properly.
// Used for specific cases for when content from outside the editor is pasted
// into it. This includes content from other editors, as well as content from
// the web that has produced bugs in the past.
describe("Paste tests (HTML)", () => {
  const getEditor = createTestEditor(testSchema);

  for (const { testCase, executeTest } of pasteTestInstancesHTML) {
    it(`${testCase.name}`, async () => {
      await executeTest(getEditor(), testCase);
    });
  }
});

describe("Paste tests (Markdown)", () => {
  const getEditor = createTestEditor(testSchema);

  for (const { testCase, executeTest } of pasteTestInstancesMarkdown) {
    it(`${testCase.name}`, async () => {
      await executeTest(getEditor(), testCase);
    });
  }
});
