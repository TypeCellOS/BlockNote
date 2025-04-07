import { describe, expect, it } from "vitest";

import { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import { UnreachableCaseError } from "../../../../util/typescript.js";
import { blockToNode } from "../../../nodeConversions/blockToNode.js";
import { setupTestEditor } from "../../setupTestEditor.js";
import {
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema,
} from "../../testSchema.js";
import { addIdsToBlock } from "../formatConversionTestUtil.js";
import { ExportTestCase, getExportTestCases } from "./getExportTestCases.js";

// Test for verifying that exporting blocks to other formats works as expected.
// Used broadly to ensure each block or set of blocks is correctly converted
// into different formats.
const testExportTest = async <
  ConversionType extends "blocknoteHTML" | "html" | "markdown" | "nodes"
>(
  editor: BlockNoteEditor<
    TestBlockSchema,
    TestInlineContentSchema,
    TestStyleSchema
  >,
  testCase: ExportTestCase<ConversionType>
) => {
  (window as any).__TEST_OPTIONS.mockID = 0;
  if (testCase.conversionType === "blocknoteHTML") {
    await expect(
      await editor.blocksToFullHTML(testCase.content)
    ).toMatchFileSnapshot(
      `./__snapshots__/${testCase.conversionType}/${testCase.name}.html`
    );
  } else if (testCase.conversionType === "html") {
    await expect(
      await editor.blocksToHTMLLossy(testCase.content)
    ).toMatchFileSnapshot(
      `./__snapshots__/${testCase.conversionType}/${testCase.name}.html`
    );
  } else if (testCase.conversionType === "markdown") {
    await expect(
      await editor.blocksToMarkdownLossy(testCase.content)
    ).toMatchFileSnapshot(
      `./__snapshots__/${testCase.conversionType}/${testCase.name}.md`
    );
  } else if (testCase.conversionType === "nodes") {
    await expect(
      testCase.content.map((block) => {
        addIdsToBlock(block);

        return blockToNode(block, editor.pmSchema, editor.schema.styleSchema);
      })
    ).toMatchFileSnapshot(
      `./__snapshots__/${testCase.conversionType}/${testCase.name}.json`
    );
  } else {
    throw new UnreachableCaseError(testCase.conversionType);
  }
};

describe("Export tests", async () => {
  const getEditor = setupTestEditor();

  for (const testCase of [
    ...getExportTestCases("blocknoteHTML"),
    ...getExportTestCases("html"),
    ...getExportTestCases("markdown"),
    ...getExportTestCases("nodes"),
  ]) {
    it(`${testCase.name}`, async () => {
      await testExportTest(getEditor(), testCase);
    });
  }
});
