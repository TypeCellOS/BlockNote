import { describe, expect, it } from "vitest";

import { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import { selectedFragmentToHTML } from "../../../clipboard/toClipboard/copyExtension.js";
import { setupTestEditor } from "../../setupTestEditor.js";
import {
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema,
} from "../../testSchema.js";
import {
  CopyPasteEqualityTestCase,
  getCopyPasteEqualityTestCases,
} from "./getCopyPasteEqualityTestCases.js";
import { doPaste } from "../clipboardTestUtil.js";

// Test for verifying that copying and pasting content in place within the
// editor results in the same document as the original. Used broadly to ensure
// that converting to and from clipboard data does not result in any data loss.
const testCopyPasteEqualityTest = (
  editor: BlockNoteEditor<
    TestBlockSchema,
    TestInlineContentSchema,
    TestStyleSchema
  >,
  testCase: CopyPasteEqualityTestCase
) => {
  (window as any).__TEST_OPTIONS.mockID = 0;
  editor.replaceBlocks(editor.document, testCase.document);

  if (!editor.prosemirrorView) {
    throw new Error("Editor view not initialized.");
  }

  editor.dispatch(
    editor._tiptapEditor.state.tr.setSelection(
      testCase.getCopyAndPasteSelection(editor.prosemirrorView.state.doc)
    )
  );

  const { clipboardHTML } = selectedFragmentToHTML(
    editor.prosemirrorView,
    editor
  );

  const originalDocument = editor.document;
  doPaste(
    editor.prosemirrorView,
    "text",
    clipboardHTML,
    false,
    new ClipboardEvent("paste")
  );
  const newDocument = editor.document;

  expect(newDocument).toStrictEqual(originalDocument);
};

describe("Copy/paste equality tests", () => {
  const getEditor = setupTestEditor();

  for (const testCase of getCopyPasteEqualityTestCases()) {
    it(`${testCase.name}`, async () => {
      testCopyPasteEqualityTest(getEditor(), testCase);
    });
  }
});
