import { prettify } from "htmlfy";
import { expect } from "vite-plus/test";
import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";

import { initTestEditor } from "../../support/testUtil.js";
import { normalizeHTMLStyleAttribute } from "../../support/normalizeHTMLStyleAttribute.js";
import { copyToClipboard } from "../copyToClipboard.js";
import { CopyTestCase } from "./copyTestCase.js";

export const testCopyBlockNoteHTML = async <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: CopyTestCase<B, I, S>,
) => {
  initTestEditor(editor, testCase.document, testCase.getCopySelection);

  const { clipboardHTML } = copyToClipboard(editor);

  await expect(
    prettify(normalizeHTMLStyleAttribute(clipboardHTML), { tag_wrap: true }),
  ).toMatchFileSnapshot(`./__snapshots__/blocknote/html/${testCase.name}.html`);
};

export const testCopyHTML = async <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: CopyTestCase<B, I, S>,
  { checkMarkdown = false } = {},
) => {
  initTestEditor(editor, testCase.document, testCase.getCopySelection);

  const { externalHTML, markdown } = copyToClipboard(editor);

  await expect(
    prettify(normalizeHTMLStyleAttribute(externalHTML), { tag_wrap: true }),
  ).toMatchFileSnapshot(`./__snapshots__/text/html/${testCase.name}.html`);
  if (checkMarkdown) {
    // Both payloads are produced by the same copy operation.
    await expect(markdown).toMatchFileSnapshot(
      `./__snapshots__/text/plain/${testCase.name}.md`,
    );
  }
};
