import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  selectedFragmentToHTML,
  StyleSchema,
} from "@blocknote/core";
import { expect } from "vitest";

import {
  doPaste,
  setupClipboardTest,
} from "../../../core/clipboard/clipboardTestUtil.js";
import { CopyPasteTestCase } from "./copyPasteTestCase.js";

export const testCopyPaste = async <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: CopyPasteTestCase<B, I, S>,
) => {
  setupClipboardTest(editor, testCase.document, testCase.getCopySelection);

  const { clipboardHTML } = selectedFragmentToHTML(
    editor.prosemirrorView!,
    editor,
  );

  editor.transact((tr) => tr.setSelection(testCase.getPasteSelection(tr.doc)));

  doPaste(
    editor.prosemirrorView!,
    "text",
    clipboardHTML,
    false,
    new ClipboardEvent("paste"),
  );

  await expect(editor.document).toMatchFileSnapshot(
    `./__snapshots__/${testCase.name}.json`,
  );
};
