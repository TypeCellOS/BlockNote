import {
  BlockNoteEditor,
  BlockSchema,
  blockToNode,
  InlineContentSchema,
  nodeToBlock,
  partialBlocksToBlocks,
  StyleSchema,
} from "@blocknote/core";
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
  const fullBlocks = partialBlocksToBlocks(editor.schema, testCase.content);

  const exported = await editor.blocksToFullHTML(fullBlocks);

  if (testCase.name.startsWith("malformed/")) {
    // We purposefully are okay with malformed response, we know they won't match
    expect(await editor.tryParseHTMLToBlocks(exported)).not.toStrictEqual(
      fullBlocks,
    );
  } else {
    expect(await editor.tryParseHTMLToBlocks(exported)).toStrictEqual(
      fullBlocks,
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

  const fullBlocks = partialBlocksToBlocks(editor.schema, testCase.content);

  const exported = await editor.blocksToHTMLLossy(fullBlocks);

  // Reset mock ID as we don't expect block IDs to be preserved in this
  // conversion.
  (window as any).__TEST_OPTIONS.mockID = 0;

  expect(await editor.tryParseHTMLToBlocks(exported)).toStrictEqual(fullBlocks);
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

  const fullBlocks = partialBlocksToBlocks(editor.schema, testCase.content);

  const exported = fullBlocks.map((block) =>
    blockToNode(block, editor.pmSchema),
  );

  expect(
    exported.map((node) => nodeToBlock(node, editor.pmSchema)),
  ).toStrictEqual(fullBlocks);
};
