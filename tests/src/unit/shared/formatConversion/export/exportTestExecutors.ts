import {
  BlockNoteEditor,
  BlockSchema,
  blockToNode,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { addIdsToBlocks } from "@shared/formatConversionTestUtil.js";
import { prettify } from "htmlfy";
import { expect } from "vitest";

import { ExportTestCase } from "./exportTestCase.js";

// Preserve `<code>` whitespace so code-block snapshots show actual newlines
// instead of having them collapsed by the prettifier.
const PRETTIFY_OPTIONS = { tag_wrap: true, ignore: ["code"] } as const;

export const testExportBlockNoteHTML = async <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: ExportTestCase<B, I, S>,
) => {
  (window as any).__TEST_OPTIONS.mockID = 0;

  addIdsToBlocks(testCase.content);

  await expect(
    prettify(await editor.blocksToFullHTML(testCase.content), PRETTIFY_OPTIONS),
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

  addIdsToBlocks(testCase.content);

  await expect(
    prettify(await editor.blocksToHTMLLossy(testCase.content), PRETTIFY_OPTIONS),
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

  addIdsToBlocks(testCase.content);

  await expect(
    await editor.blocksToMarkdownLossy(testCase.content),
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

  addIdsToBlocks(testCase.content);

  await expect(
    testCase.content.map((block) =>
      blockToNode(block, editor.pmSchema, editor.schema.styleSchema),
    ),
  ).toMatchFileSnapshot(`./__snapshots__/nodes/${testCase.name}.json`);
};
