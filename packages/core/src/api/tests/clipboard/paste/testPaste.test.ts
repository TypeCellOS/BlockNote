import { describe, expect, it } from "vitest";

import { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../../schema/index.js";
import { setupTestEditor } from "../../setupTestEditor.js";
import { testSchema } from "../../testSchema.js";
import { doPaste } from "../clipboardTestUtil.js";
import { getPasteTestCases, PasteTestCase } from "./getPasteTestCases.js";

// Test for verifying that clipboard data gets pasted into the editor properly.
// Used for specific cases for when content from outside the editor is pasted
// into it. This includes content from other editors, as well as content from
// the web that has produced bugs in the past.
export const testPaste = async <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: PasteTestCase<B, I, S>
) => {
  (window as any).__TEST_OPTIONS.mockID = 0;
  editor.replaceBlocks(editor.document, testCase.document);

  if (!editor.prosemirrorView) {
    throw new Error("Editor view not initialized.");
  }

  editor.dispatch(
    editor._tiptapEditor.state.tr.setSelection(
      testCase.getPasteSelection(editor.prosemirrorView.state.doc)
    )
  );

  doPaste(
    editor.prosemirrorView,
    testCase.content,
    testCase.content,
    testCase.clipboardDataType !== "text/html",
    new ClipboardEvent("paste")
  );

  await expect(editor.document).toMatchFileSnapshot(
    `./__snapshots__/${testCase.clipboardDataType}/${testCase.name}.json`
  );
};

describe("Paste tests", () => {
  const getEditor = setupTestEditor(testSchema);

  for (const testCase of getPasteTestCases()) {
    it(`${testCase.name}`, async () => {
      await testPaste(getEditor(), testCase);
    });
  }
});
