import { prettify } from "htmlfy";
import { describe, expect, it } from "vitest";

import { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../../schema/index.js";
import { UnreachableCaseError } from "../../../../util/typescript.js";
import { blockToNode } from "../../../nodeConversions/blockToNode.js";
import { setupTestEditor } from "../../setupTestEditor.js";
import { testSchema } from "../../testSchema.js";
import { addIdsToBlocks } from "../formatConversionTestUtil.js";
import { ExportTestCase, getExportTestCases } from "./getExportTestCases.js";

// Test for verifying that exporting blocks to other formats works as expected.
// Used broadly to ensure each block or set of blocks is correctly converted
// into different formats.
export const testExport = async <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: ExportTestCase<B, I, S>
) => {
  (window as any).__TEST_OPTIONS.mockID = 0;

  addIdsToBlocks(testCase.content);

  if (testCase.conversionType === "blocknoteHTML") {
    await expect(
      prettify(await editor.blocksToFullHTML(testCase.content), {
        tag_wrap: true,
      })
    ).toMatchFileSnapshot(
      `./__snapshots__/${testCase.conversionType}/${testCase.name}.html`
    );
  } else if (testCase.conversionType === "html") {
    await expect(
      prettify(await editor.blocksToHTMLLossy(testCase.content), {
        tag_wrap: true,
      })
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
      testCase.content.map((block) =>
        blockToNode(block, editor.pmSchema, editor.schema.styleSchema)
      )
    ).toMatchFileSnapshot(
      `./__snapshots__/${testCase.conversionType}/${testCase.name}.json`
    );
  } else {
    throw new UnreachableCaseError(testCase.conversionType);
  }
};

describe("Export tests", () => {
  const getEditor = setupTestEditor(testSchema);

  for (const testCase of [
    ...getExportTestCases("blocknoteHTML"),
    ...getExportTestCases("html"),
    ...getExportTestCases("markdown"),
    ...getExportTestCases("nodes"),
  ]) {
    it(`${testCase.name}`, async () => {
      await testExport(getEditor(), testCase);
    });
  }
});
