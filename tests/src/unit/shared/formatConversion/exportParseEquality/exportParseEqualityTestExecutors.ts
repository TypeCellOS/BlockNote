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
