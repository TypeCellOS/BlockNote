import {
  BlockNoteEditor,
  BlockSchema,
  blockToNode,
  InlineContentSchema,
  nodeToBlock,
  StyleSchema,
} from "@blocknote/core";
import {
  addIdsToBlocks,
  partialBlocksToBlocksForTesting,
} from "@shared/formatConversionTestUtil.js";
import { expect } from "vitest";

import { ExportParseEqualityTestCase } from "./exportParseEqualityTestCase.js";

export const testExportParseEqualityBlockNoteHTML = async <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: ExportParseEqualityTestCase<B, I, S>,
) => {
  (window as any).__TEST_OPTIONS.mockID = 0;

  addIdsToBlocks(testCase.content);

  const exported = await editor.blocksToFullHTML(testCase.content);

  if (testCase.name.startsWith("malformed/")) {
    // We purposefully are okay with malformed response, we know they won't match
    expect(await editor.tryParseHTMLToBlocks(exported)).not.toStrictEqual(
      partialBlocksToBlocksForTesting(editor.schema, testCase.content),
    );
  } else {
    expect(await editor.tryParseHTMLToBlocks(exported)).toStrictEqual(
      partialBlocksToBlocksForTesting(editor.schema, testCase.content),
    );
  }
};

export const testExportParseEqualityHTML = async <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: ExportParseEqualityTestCase<B, I, S>,
) => {
  (window as any).__TEST_OPTIONS.mockID = 0;

  addIdsToBlocks(testCase.content);

  const exported = await editor.blocksToHTMLLossy(testCase.content);

  // Reset mock ID as we don't expect block IDs to be preserved in this
  // conversion.
  (window as any).__TEST_OPTIONS.mockID = 0;

  expect(await editor.tryParseHTMLToBlocks(exported)).toStrictEqual(
    partialBlocksToBlocksForTesting(editor.schema, testCase.content),
  );
};

export const testExportParseEqualityMarkdown = async <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: ExportParseEqualityTestCase<B, I, S>,
) => {
  (window as any).__TEST_OPTIONS.mockID = 0;

  addIdsToBlocks(testCase.content);

  const exported = await editor.blocksToMarkdownLossy(testCase.content);

  // Reset mock ID as we don't expect block IDs to be preserved in this
  // conversion.
  (window as any).__TEST_OPTIONS.mockID = 0;

  // Markdown is lossy (colors, underline, alignment are dropped), so we use
  // snapshot matching to capture the expected round-trip result rather than
  // strict equality with the input.
  await expect(
    await editor.tryParseMarkdownToBlocks(exported),
  ).toMatchFileSnapshot(
    `./__snapshots__/markdown/${testCase.name}.json`,
  );
};

export const testExportParseEqualityNodes = async <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: ExportParseEqualityTestCase<B, I, S>,
) => {
  (window as any).__TEST_OPTIONS.mockID = 0;

  addIdsToBlocks(testCase.content);

  const exported = testCase.content.map((block) =>
    blockToNode(block, editor.pmSchema),
  );

  expect(
    exported.map((node) => nodeToBlock(node, editor.pmSchema)),
  ).toStrictEqual(
    partialBlocksToBlocksForTesting(editor.schema, testCase.content),
  );
};
