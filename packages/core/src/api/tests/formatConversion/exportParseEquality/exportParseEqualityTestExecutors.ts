import { expect } from "vitest";

import { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../../schema/index.js";
import { blockToNode } from "../../../nodeConversions/blockToNode.js";
import { nodeToBlock } from "../../../nodeConversions/nodeToBlock.js";
import {
  addIdsToBlocks,
  partialBlocksToBlocksForTesting,
} from "../formatConversionTestUtil.js";
import { ExportParseEqualityTestCase } from "./exportParseEqualityTestCase.js";

export const testExportParseEqualityBlockNoteHTML = async <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: ExportParseEqualityTestCase<B, I, S>
) => {
  (window as any).__TEST_OPTIONS.mockID = 0;

  addIdsToBlocks(testCase.content);

  const exported = await editor.blocksToFullHTML(testCase.content);

  expect(await editor.tryParseHTMLToBlocks(exported)).toStrictEqual(
    partialBlocksToBlocksForTesting(editor.schema, testCase.content)
  );
};

export const testExportParseEqualityNodes = async <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: ExportParseEqualityTestCase<B, I, S>
) => {
  (window as any).__TEST_OPTIONS.mockID = 0;

  addIdsToBlocks(testCase.content);

  const exported = testCase.content.map((block) =>
    blockToNode(block, editor.pmSchema, editor.schema.styleSchema)
  );

  expect(
    exported.map((node) =>
      nodeToBlock(
        node,
        editor.schema.blockSchema,
        editor.schema.inlineContentSchema,
        editor.schema.styleSchema
      )
    )
  ).toStrictEqual(
    partialBlocksToBlocksForTesting(editor.schema, testCase.content)
  );
};
