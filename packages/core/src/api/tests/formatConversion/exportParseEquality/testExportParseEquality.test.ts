import { describe, expect, it } from "vitest";

import { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import { UnreachableCaseError } from "../../../../util/typescript.js";
import { blockToNode } from "../../../nodeConversions/blockToNode.js";
import { nodeToBlock } from "../../../nodeConversions/nodeToBlock.js";
import { setupTestEditor } from "../../setupTestEditor.js";
import {
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema,
} from "../../testSchema.js";
import {
  addIdsToBlocks,
  partialBlocksToBlocksForTesting,
} from "../formatConversionTestUtil.js";
import {
  ExportParseEqualityTestCase,
  getExportParseEqualityTestCases,
} from "./getExportParseEqualityTestCases.js";

// Test for verifying that exporting blocks to another format, then importing
// them back results in the same blocks as the original. Used broadly to ensure
// that exporting and importing blocks does not result in any data loss.
const testExportParseEqualityTest = async (
  editor: BlockNoteEditor<
    TestBlockSchema,
    TestInlineContentSchema,
    TestStyleSchema
  >,
  testCase: ExportParseEqualityTestCase
) => {
  (window as any).__TEST_OPTIONS.mockID = 0;

  addIdsToBlocks(testCase.content);

  if (testCase.conversionType === "blocknoteHTML") {
    const exported = await editor.blocksToFullHTML(testCase.content);

    expect(await editor.tryParseHTMLToBlocks(exported)).toStrictEqual(
      partialBlocksToBlocksForTesting(editor.schema, testCase.content)
    );
  } else if (testCase.conversionType === "nodes") {
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
  } else {
    throw new UnreachableCaseError(testCase.conversionType);
  }
};

describe("Export/parse equality tests", () => {
  const getEditor = setupTestEditor();

  for (const testCase of [
    ...getExportParseEqualityTestCases("blocknoteHTML"),
    ...getExportParseEqualityTestCases("nodes"),
  ]) {
    it(`${testCase.name}`, async () => {
      await testExportParseEqualityTest(getEditor(), testCase);
    });
  }
});
