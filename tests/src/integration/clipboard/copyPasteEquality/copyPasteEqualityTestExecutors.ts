import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { expect } from "vite-plus/test";

import { initTestEditor } from "../../support/testUtil.js";
import { copyToClipboard } from "../copyToClipboard.js";
import { CopyPasteEqualityTestCase } from "./copyPasteEqualityTestCase.js";

export const testCopyPasteEquality = async <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: CopyPasteEqualityTestCase<B, I, S>,
) => {
  initTestEditor(editor, testCase.document, testCase.getCopyAndPasteSelection);

  const { clipboardHTML } = copyToClipboard(editor);

  const originalDocument = editor.document;
  editor.pasteHTML(clipboardHTML, true);
  const newDocument = editor.document;

  expect(newDocument).toStrictEqual(originalDocument);
};
