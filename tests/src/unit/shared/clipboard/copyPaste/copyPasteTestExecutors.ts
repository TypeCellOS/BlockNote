import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { expect } from "vite-plus/test";

import { initTestEditor } from "../../testUtil.js";
import { copyToClipboard } from "../copyToClipboard.js";
import { CopyPasteTestCase } from "./copyPasteTestCase.js";

export const testCopyPaste = async <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: CopyPasteTestCase<B, I, S>,
) => {
  initTestEditor(editor, testCase.document, testCase.getCopySelection);

  const { clipboardHTML } = copyToClipboard(editor);

  editor.transact((tr) => tr.setSelection(testCase.getPasteSelection(tr.doc)));

  editor.pasteHTML(clipboardHTML, true);

  await expect(editor.document).toMatchFileSnapshot(
    `./__snapshots__/${testCase.name}.json`,
  );
};
