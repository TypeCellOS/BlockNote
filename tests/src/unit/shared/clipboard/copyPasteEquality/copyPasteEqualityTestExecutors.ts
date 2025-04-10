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
import { CopyPasteEqualityTestCase } from "./copyPasteEqualityTestCase.js";

export const testCopyPasteEquality = async <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: CopyPasteEqualityTestCase<B, I, S>
) => {
  setupClipboardTest(
    editor,
    testCase.document,
    testCase.getCopyAndPasteSelection
  );

  const { clipboardHTML } = selectedFragmentToHTML(
    editor.prosemirrorView!,
    editor
  );

  const originalDocument = editor.document;
  doPaste(
    editor.prosemirrorView!,
    "text",
    clipboardHTML,
    false,
    new ClipboardEvent("paste")
  );
  const newDocument = editor.document;

  expect(newDocument).toStrictEqual(originalDocument);
};
