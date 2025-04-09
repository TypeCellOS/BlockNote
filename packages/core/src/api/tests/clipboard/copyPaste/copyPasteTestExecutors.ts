import { expect } from "vitest";

import { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../../schema/index.js";
import { selectedFragmentToHTML } from "../../../clipboard/toClipboard/copyExtension.js";
import { doPaste, setupClipboardTest } from "../clipboardTestUtil.js";
import { CopyPasteTestCase } from "./copyPasteTestCase.js";

export const testCopyPaste = async <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: CopyPasteTestCase<B, I, S>
) => {
  setupClipboardTest(editor, testCase.document, testCase.getCopySelection);

  const { clipboardHTML } = selectedFragmentToHTML(
    editor.prosemirrorView!,
    editor
  );

  editor.dispatch(
    editor._tiptapEditor.state.tr.setSelection(
      testCase.getPasteSelection(editor.prosemirrorView!.state.doc)
    )
  );

  doPaste(
    editor.prosemirrorView!,
    "text",
    clipboardHTML,
    false,
    new ClipboardEvent("paste")
  );

  await expect(editor.document).toMatchFileSnapshot(
    `./__snapshots__/${testCase.name}.json`
  );
};
