import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BlockNoteEditor } from "../../../BlockNoteEditor";

import {
  BlockSchema,
  PartialBlock,
} from "../../../extensions/Blocks/api/blocks/types";
import { InlineContentSchema } from "../../../extensions/Blocks/api/inlineContent/types";
import { StyleSchema } from "../../../extensions/Blocks/api/styles/types";
import { partialBlocksToBlocksForTesting } from "../../nodeConversions/testUtil";
import { customBlocksTestCases } from "../../testCases/cases/customBlocks";
import { customInlineContentTestCases } from "../../testCases/cases/customInlineContent";
import { customStylesTestCases } from "../../testCases/cases/customStyles";
import { defaultSchemaTestCases } from "../../testCases/cases/defaultSchema";

async function convertToMarkdownAndCompareSnapshots<
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<B, I, S>,
  blocks: PartialBlock<B, I, S>[],
  snapshotDirectory: string,
  snapshotName: string
) {
  const fullBlocks = partialBlocksToBlocksForTesting(
    editor.blockSchema,
    blocks
  );
  const md = await editor.blocksToMarkdownLossy(fullBlocks);
  const snapshotPath =
    "./__snapshots__/" +
    snapshotDirectory +
    "/" +
    snapshotName +
    "/markdown.md";
  console.log(md);
  expect(md).toMatchFileSnapshot(snapshotPath);
}

const testCases = [
  defaultSchemaTestCases,
  customBlocksTestCases,
  customStylesTestCases,
  customInlineContentTestCases,
];

describe("markdownExporter", () => {
  for (const testCase of testCases) {
    describe("Case: " + testCase.name, () => {
      let editor: BlockNoteEditor<any, any, any>;

      beforeEach(() => {
        editor = testCase.createEditor();
      });

      afterEach(() => {
        editor._tiptapEditor.destroy();
        editor = undefined as any;

        delete (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS;
      });

      for (const document of testCase.documents) {
        // eslint-disable-next-line no-loop-func
        it("Convert " + document.name + " to HTML", async () => {
          const nameSplit = document.name.split("/");
          await convertToMarkdownAndCompareSnapshots(
            editor,
            document.blocks,
            nameSplit[0],
            nameSplit[1]
          );
        });
      }
    });
  }
});
