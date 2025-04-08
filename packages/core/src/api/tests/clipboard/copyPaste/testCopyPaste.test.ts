import { describe, expect, it } from "vitest";

import { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import { selectedFragmentToHTML } from "../../../clipboard/toClipboard/copyExtension.js";
import { setupTestEditor } from "../../setupTestEditor.js";
import {
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema,
} from "../../testSchema.js";
import { doPaste } from "../clipboardTestUtil.js";
import {
  CopyPasteTestCase,
  getCopyPasteTestCases,
} from "./getCopyPasteTestCases.js";

// Test for verifying that copying and pasting content within the editor works
// as expected. Used for specific cases where unexpected behaviour was noticed.
const testCopyPasteTest = async (
  editor: BlockNoteEditor<
    TestBlockSchema,
    TestInlineContentSchema,
    TestStyleSchema
  >,
  testCase: CopyPasteTestCase
) => {
  (window as any).__TEST_OPTIONS.mockID = 0;
  editor.replaceBlocks(editor.document, testCase.document);

  if (!editor.prosemirrorView) {
    throw new Error("Editor view not initialized.");
  }

  editor.dispatch(
    editor._tiptapEditor.state.tr.setSelection(
      testCase.getCopySelection(editor.prosemirrorView.state.doc)
    )
  );

  const { clipboardHTML } = selectedFragmentToHTML(
    editor.prosemirrorView,
    editor
  );

  editor.dispatch(
    editor._tiptapEditor.state.tr.setSelection(
      testCase.getPasteSelection(editor.prosemirrorView.state.doc)
    )
  );

  doPaste(
    editor.prosemirrorView,
    "text",
    clipboardHTML,
    false,
    new ClipboardEvent("paste")
  );

  await expect(editor.document).toMatchFileSnapshot(
    `./__snapshots__/${testCase.name}.json`
  );
};

describe("Copy/paste tests", () => {
  const getEditor = setupTestEditor();

  for (const testCase of getCopyPasteTestCases()) {
    it(`${testCase.name}`, async () => {
      await testCopyPasteTest(getEditor(), testCase);
    });
  }
});
