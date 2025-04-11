import { describe, it } from "vitest";

import { setupTestEditor } from "../../setupTestEditor.js";
import { testSchema } from "../../testSchema.js";
import {
  parseTestInstancesHTML,
  parseTestInstancesMarkdown,
} from "./parseTestInstances.js";

// Tests for verifying that importing blocks from other formats works as
// expected. Used for specific cases for when content from outside the editor is
// imported as blocks. This includes content from other editors, as well as
// content from the web that has produced bugs in the past.
describe("Parse tests (HTML)", () => {
  const getEditor = setupTestEditor(testSchema);

  for (const { testCase, executeTest } of parseTestInstancesHTML) {
    it(`${testCase.name}`, async () => {
      await executeTest(getEditor(), testCase);
    });
  }
});

describe("Parse tests (Markdown)", () => {
  const getEditor = setupTestEditor(testSchema);

  for (const { testCase, executeTest } of parseTestInstancesMarkdown) {
    it(`${testCase.name}`, async () => {
      await executeTest(getEditor(), testCase);
    });
  }
});
