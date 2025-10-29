import {
  BlockNoteEditor,
  BlockSchema,
  blockToNode,
  InlineContentSchema,
  partialBlocksToBlocks,
  partialBlockToBlock,
  StyleSchema,
} from "@blocknote/core";
import { prettify } from "htmlfy";
import { expect } from "vitest";

import { ExportTestCase } from "./exportTestCase.js";

export const testExportBlockNoteHTML = async <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: ExportTestCase<B, I, S>,
) => {
  (window as any).__TEST_OPTIONS.mockID = 0;

  await expect(
    prettify(
      await editor.blocksToFullHTML(
        partialBlocksToBlocks(editor.schema, testCase.content),
      ),
      {
        tag_wrap: true,
      },
    ),
  ).toMatchFileSnapshot(`./__snapshots__/blocknoteHTML/${testCase.name}.html`);
};

export const testExportHTML = async <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: ExportTestCase<B, I, S>,
) => {
  (window as any).__TEST_OPTIONS.mockID = 0;

  await expect(
    prettify(
      await editor.blocksToHTMLLossy(
        partialBlocksToBlocks(editor.schema, testCase.content),
      ),
      {
        tag_wrap: true,
      },
    ),
  ).toMatchFileSnapshot(`./__snapshots__/html/${testCase.name}.html`);
};

export const testExportMarkdown = async <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: ExportTestCase<B, I, S>,
) => {
  (window as any).__TEST_OPTIONS.mockID = 0;

  await expect(
    await editor.blocksToMarkdownLossy(
      partialBlocksToBlocks(editor.schema, testCase.content),
    ),
  ).toMatchFileSnapshot(`./__snapshots__/markdown/${testCase.name}.md`);
};

export const testExportNodes = async <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: ExportTestCase<B, I, S>,
) => {
  (window as any).__TEST_OPTIONS.mockID = 0;

  await expect(
    testCase.content.map((block) =>
      blockToNode(
        partialBlockToBlock(editor.schema, block),
        editor.pmSchema,
        editor.schema.styleSchema,
      ),
    ),
  ).toMatchFileSnapshot(`./__snapshots__/nodes/${testCase.name}.json`);
};
