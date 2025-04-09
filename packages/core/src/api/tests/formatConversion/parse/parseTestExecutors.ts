import { expect } from "vitest";

import { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../../schema/index.js";
import { ParseTestCase } from "./parseTestCase.js";

export const testParseHTML = async <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: ParseTestCase
) => {
  (window as any).__TEST_OPTIONS.mockID = 0;

  await expect(
    await editor.tryParseHTMLToBlocks(testCase.content)
  ).toMatchFileSnapshot(`./__snapshots__/html/${testCase.name}.json`);
};

export const testParseMarkdown = async <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: ParseTestCase
) => {
  (window as any).__TEST_OPTIONS.mockID = 0;

  await expect(
    await editor.tryParseMarkdownToBlocks(testCase.content)
  ).toMatchFileSnapshot(`./__snapshots__/markdown/${testCase.name}.json`);
};
