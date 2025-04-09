import { prettify } from "htmlfy";
import { expect } from "vitest";

import { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../../schema/index.js";
import { selectedFragmentToHTML } from "../../../clipboard/toClipboard/copyExtension.js";
import { setupClipboardTest } from "../clipboardTestUtil.js";
import { CopyTestCase } from "./copyTestCase.js";

export const testCopyBlockNoteHTML = async <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: CopyTestCase<B, I, S>
) => {
  setupClipboardTest(editor, testCase.document, testCase.getCopySelection);

  const { clipboardHTML } = selectedFragmentToHTML(
    editor.prosemirrorView!,
    editor
  );

  await expect(prettify(clipboardHTML, { tag_wrap: true })).toMatchFileSnapshot(
    `./__snapshots__/blocknote/html/${testCase.name}.html`
  );
};

export const testCopyHTML = async <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: CopyTestCase<B, I, S>
) => {
  setupClipboardTest(editor, testCase.document, testCase.getCopySelection);

  const { externalHTML } = selectedFragmentToHTML(
    editor.prosemirrorView!,
    editor
  );

  await expect(prettify(externalHTML, { tag_wrap: true })).toMatchFileSnapshot(
    `./__snapshots__/text/html/${testCase.name}.html`
  );
};

export const testCopyMarkdown = async <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: CopyTestCase<B, I, S>
) => {
  setupClipboardTest(editor, testCase.document, testCase.getCopySelection);

  const { markdown } = selectedFragmentToHTML(editor.prosemirrorView!, editor);

  await expect(markdown).toMatchFileSnapshot(
    `./__snapshots__/text/plain/${testCase.name}.md`
  );
};
