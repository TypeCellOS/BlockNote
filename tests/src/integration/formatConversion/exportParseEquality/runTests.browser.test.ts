import { describe } from "vite-plus/test";

import { useFileTestEditor } from "../../support/testEditorOptions.js";
import {
  testExportParseEqualityBlockNoteHTML,
  testExportParseEqualityHTML,
  testExportParseEqualityMarkdown,
} from "./exportParseEqualityTestExecutors.js";
import { exportCases } from "../export/exportTestInstances.js";
import {
  htmlRoundTripCases,
  markdownRoundTripCases,
} from "./exportParseEqualityTestInstances.js";

// Round-tripping does not dispatch changes to the editor.
const it = useFileTestEditor();

// Tests for verifying that exporting blocks to another format, then importing
// them back results in the same blocks as the original. Used for as many cases
// as possible to ensure that exporting and importing blocks does not result in
// any data loss.
describe("Export/parse equality tests (BlockNote HTML)", () => {
  for (const testCase of exportCases) {
    it(`${testCase.name}`, ({ editor }) => {
      testExportParseEqualityBlockNoteHTML(editor, testCase);
    });
  }
});

describe("Export/parse equality tests (HTML)", () => {
  for (const testCase of htmlRoundTripCases) {
    it(`${testCase.name}`, ({ editor }) => {
      testExportParseEqualityHTML(editor, testCase);
    });
  }
});

describe("Export/parse equality tests (Markdown)", () => {
  for (const testCase of markdownRoundTripCases) {
    it(`${testCase.name}`, async ({ editor }) => {
      await testExportParseEqualityMarkdown(editor, testCase);
    });
  }
});
