import { prettify } from "htmlfy";
import { describe, expect, it } from "vitest";

import { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import { UnreachableCaseError } from "../../../../util/typescript.js";
import { selectedFragmentToHTML } from "../../../clipboard/toClipboard/copyExtension.js";
import { setupTestEditor } from "../../setupTestEditor.js";
import {
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema,
} from "../../testSchema.js";
import { CopyTestCase, getCopyTestCases } from "./getCopyTestCases.js";

// Test for verifying content that gets put on the clipboard when copying within
// the editor. Used broadly to ensure each block or set of blocks is correctly
// converted into different types of clipboard data.
const testCopyTest = async (
  editor: BlockNoteEditor<
    TestBlockSchema,
    TestInlineContentSchema,
    TestStyleSchema
  >,
  testCase: CopyTestCase
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

  const { clipboardHTML, externalHTML, markdown } = selectedFragmentToHTML(
    editor.prosemirrorView,
    editor
  );

  if (testCase.clipboardDataType === "blocknote/html") {
    await expect(
      prettify(clipboardHTML, { tag_wrap: true })
    ).toMatchFileSnapshot(
      `./__snapshots__/${testCase.clipboardDataType}/${testCase.name}.html`
    );
  } else if (testCase.clipboardDataType === "text/html") {
    await expect(
      prettify(externalHTML, { tag_wrap: true })
    ).toMatchFileSnapshot(
      `./__snapshots__/${testCase.clipboardDataType}/${testCase.name}.html`
    );
  } else if (testCase.clipboardDataType === "text/plain") {
    await expect(markdown).toMatchFileSnapshot(
      `./__snapshots__/${testCase.clipboardDataType}/${testCase.name}.md`
    );
  } else {
    throw new UnreachableCaseError(testCase.clipboardDataType);
  }
};

describe("Copy tests", () => {
  const getEditor = setupTestEditor();

  for (const testCase of getCopyTestCases()) {
    it(`${testCase.name}`, async () => {
      await testCopyTest(getEditor(), testCase);
    });
  }
});
