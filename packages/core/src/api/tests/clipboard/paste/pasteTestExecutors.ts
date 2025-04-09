import { expect } from "vitest";

import { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../../schema/index.js";
import { doPaste, setupClipboardTest } from "../clipboardTestUtil.js";
import { PasteTestCase } from "./pasteTestCase.js";

export const testPasteHTML = async <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: PasteTestCase<B, I, S>
) => {
  setupClipboardTest(editor, testCase.document, testCase.getPasteSelection);

  doPaste(
    editor.prosemirrorView!,
    "",
    testCase.content,
    false,
    new ClipboardEvent("paste")
  );

  await expect(editor.document).toMatchFileSnapshot(
    `./__snapshots__/text/html/${testCase.name}.json`
  );
};

export const testPasteMarkdown = async <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: PasteTestCase<B, I, S>
) => {
  setupClipboardTest(editor, testCase.document, testCase.getPasteSelection);

  doPaste(
    editor.prosemirrorView!,
    testCase.content,
    "",
    true,
    new ClipboardEvent("paste")
  );

  await expect(editor.document).toMatchFileSnapshot(
    `./__snapshots__/text/plain/${testCase.name}.json`
  );
};
