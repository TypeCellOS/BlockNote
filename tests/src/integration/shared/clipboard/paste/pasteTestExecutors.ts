import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { expect } from "vite-plus/test";

import { initTestEditor } from "../../testUtil.js";
import { PasteTestCase } from "./pasteTestCase.js";

export const testPasteHTML = async <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: PasteTestCase<B, I, S>,
) => {
  initTestEditor(editor, testCase.document, testCase.getPasteSelection);

  editor.pasteHTML(testCase.content, true);

  await expect(editor.document).toMatchFileSnapshot(
    `./__snapshots__/text/html/${testCase.name}.json`,
  );
};

export const testPasteMarkdown = async <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: PasteTestCase<B, I, S>,
) => {
  initTestEditor(editor, testCase.document, testCase.getPasteSelection);

  editor.pasteText(testCase.content);

  await expect(editor.document).toMatchFileSnapshot(
    `./__snapshots__/text/plain/${testCase.name}.json`,
  );
};
