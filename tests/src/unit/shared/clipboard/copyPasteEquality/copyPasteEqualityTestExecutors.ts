import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  selectedFragmentToHTML,
  StyleSchema,
} from "@blocknote/core";
import { expect } from "vite-plus/test";

import { initTestEditor } from "../../testUtil.js";
import { doPaste } from "../clipboardTestUtil.js";
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

  const { clipboardHTML, markdown } = selectedFragmentToHTML(
    editor.prosemirrorView,
    editor,
  );

  const originalDocument = editor.document;
  doPaste(
    editor.prosemirrorView,
    markdown,
    clipboardHTML,
    false,
    new ClipboardEvent("paste"),
  );
  const newDocument = editor.document;

  expect(newDocument).toStrictEqual(originalDocument);
};
