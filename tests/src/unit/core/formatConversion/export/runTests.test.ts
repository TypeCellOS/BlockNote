import { describe, it } from "vitest";

import { setupTestEditor } from "../../setupTestEditor.js";
import { testSchema } from "../../testSchema.js";
import {
  exportTestInstancesBlockNoteHTML,
  exportTestInstancesHTML,
  exportTestInstancesMarkdown,
  exportTestInstancesNodes,
} from "./exportTestInstances.js";

// Tests for verifying that exporting blocks to other formats works as expected.
// Used broadly to ensure each block or set of blocks is correctly converted
// into different formats.
describe("Export tests (BlockNote HTML)", () => {
  const getEditor = setupTestEditor(testSchema);

  for (const { testCase, executeTest } of exportTestInstancesBlockNoteHTML) {
    it(`${testCase.name}`, async () => {
      await executeTest(getEditor(), testCase);
    });
  }
});

describe("Export tests (HTML)", () => {
  const getEditor = setupTestEditor(testSchema);

  for (const { testCase, executeTest } of exportTestInstancesHTML) {
    it(`${testCase.name}`, async () => {
      await executeTest(getEditor(), testCase);
    });
  }
});

describe("Export tests (Markdown)", () => {
  const getEditor = setupTestEditor(testSchema);

  for (const { testCase, executeTest } of exportTestInstancesMarkdown) {
    it(`${testCase.name}`, async () => {
      await executeTest(getEditor(), testCase);
    });
  }
});

describe("Export tests (TipTap nodes)", () => {
  const getEditor = setupTestEditor(testSchema);

  for (const { testCase, executeTest } of exportTestInstancesNodes) {
    it(`${testCase.name}`, async () => {
      await executeTest(getEditor(), testCase);
    });
  }
});
