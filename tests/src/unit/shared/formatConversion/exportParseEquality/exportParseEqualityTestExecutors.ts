import {
  BlockNoteEditor,
  BlockSchema,
  blockToNode,
  InlineContentSchema,
  nodeToBlock,
  StyleSchema,
} from "@blocknote/core";
import { partialBlocksToBlocksForTesting } from "@shared/formatConversionTestUtil.js";
import { expect } from "vite-plus/test";

import { testOptionsHost } from "../../testOptions.js";
import { prepareConversionBlocks } from "../prepareConversionBlocks.js";
import type { ExportTestCase } from "../export/exportTestCase.js";

export const testExportParseEqualityBlockNoteHTML = <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: ExportTestCase<B, I, S>,
) => {
  const input = prepareConversionBlocks<B, I, S>(testCase.content);

  if (testCase.name.startsWith("malformed/")) {
    const exported = editor.blocksToFullHTML(input);
    // Malformed partial input is intentionally not a lossless document.
    expect(editor.tryParseHTMLToBlocks(exported)).not.toStrictEqual(
      partialBlocksToBlocksForTesting(editor.schema, input),
    );
  } else {
    // Round-trip valid blocks, including schema-generated required children.
    // The shorthand helper defaults all children to [], which is invalid for
    // layout blocks with a minimum child count.
    const doc = editor.transact((tr) => tr.doc);
    const blocks = input.map((block) =>
      nodeToBlock(blockToNode(block, editor.pmSchema), doc),
    );
    const exported = editor.blocksToFullHTML(blocks);
    expect(editor.tryParseHTMLToBlocks(exported)).toStrictEqual(blocks);
  }
};

export const testExportParseEqualityHTML = <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: ExportTestCase<B, I, S>,
) => {
  const input = prepareConversionBlocks<B, I, S>(testCase.content);
  const exported = editor.blocksToHTMLLossy(input);

  // Reset mock ID as we don't expect block IDs to be preserved in this
  // conversion.
  (testOptionsHost.__TEST_OPTIONS ??= {}).mockID = 0;

  expect(editor.tryParseHTMLToBlocks(exported)).toStrictEqual(
    partialBlocksToBlocksForTesting(editor.schema, input),
  );
};

export const testExportParseEqualityMarkdown = async <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: ExportTestCase<B, I, S>,
) => {
  const input = prepareConversionBlocks<B, I, S>(testCase.content);
  const exported = editor.blocksToMarkdownLossy(input);

  // Reset mock ID as we don't expect block IDs to be preserved in this
  // conversion.
  (testOptionsHost.__TEST_OPTIONS ??= {}).mockID = 0;

  // Markdown is lossy (colors, underline, alignment are dropped), so we use
  // snapshot matching to capture the expected round-trip result rather than
  // strict equality with the input.
  await expect(editor.tryParseMarkdownToBlocks(exported)).toMatchFileSnapshot(
    `./__snapshots__/markdown/${testCase.name}.json`,
  );
};

export const testExportParseEqualityNodes = <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: ExportTestCase<B, I, S>,
) => {
  const input = prepareConversionBlocks<B, I, S>(testCase.content);

  const exported = input.map((block) => blockToNode(block, editor.pmSchema));

  const doc = editor.transact((tr) => tr.doc);
  expect(exported.map((node) => nodeToBlock(node, doc))).toStrictEqual(
    partialBlocksToBlocksForTesting(editor.schema, input),
  );
};
