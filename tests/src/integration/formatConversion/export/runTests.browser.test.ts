import { describe, expect } from "vite-plus/test";

import {
  testExportBlockNoteHTML,
  testExportHTML,
  testExportMarkdown,
} from "./exportTestExecutors.js";
import { testExportParseEqualityBlockNoteHTML } from "../exportParseEquality/exportParseEqualityTestExecutors.js";
import { useFileTestEditor } from "../../support/testEditorOptions.js";
import { exportCases } from "./exportTestInstances.js";

// These exporters read the supplied blocks, not the editor document or
// selection. Each executor still resets the mock ID counter.
const it = useFileTestEditor();

// Tests for verifying that exporting blocks to other formats works as expected.
// Used for as many cases as possible to ensure each block or set of blocks is
// correctly converted into different formats.
describe("Export tests (BlockNote HTML)", () => {
  for (const testCase of exportCases) {
    it(`${testCase.name}`, async ({ editor }) => {
      await testExportBlockNoteHTML(editor, testCase);
    });
  }
});

describe("Export tests (HTML)", () => {
  for (const testCase of exportCases) {
    it(`${testCase.name}`, async ({ editor }) => {
      await testExportHTML(editor, testCase);
    });
  }
});

describe("Export tests (Markdown)", () => {
  for (const testCase of exportCases) {
    it(`${testCase.name}`, async ({ editor }) => {
      await testExportMarkdown(editor, testCase);
    });
  }
});

it.for(["export then round-trip", "round-trip then export"] as const)(
  "shared nested fixture stays unchanged: %s",
  async (order, { editor }) => {
    const testCase = exportCases.find(
      ({ name }) => name === "paragraph/nested",
    );
    if (!testCase) {
      throw new Error("Missing paragraph/nested export fixture");
    }
    const before = structuredClone(testCase.content);
    const executors =
      order === "export then round-trip"
        ? [testExportBlockNoteHTML, testExportParseEqualityBlockNoteHTML]
        : [testExportParseEqualityBlockNoteHTML, testExportBlockNoteHTML];

    for (const run of executors) {
      await run(editor, testCase);
      const [parent] = testCase.content;
      expect(parent.id).toBeUndefined();
      expect(parent.children?.map(({ id }) => id)).toStrictEqual([
        undefined,
        undefined,
      ]);
      expect(testCase.content).toStrictEqual(before);
    }
  },
);
