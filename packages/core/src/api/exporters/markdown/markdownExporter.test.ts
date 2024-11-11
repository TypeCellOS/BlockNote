import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PartialBlock } from "../../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import { BlockSchema } from "../../../schema/blocks/types.js";
import { InlineContentSchema } from "../../../schema/inlineContent/types.js";
import { StyleSchema } from "../../../schema/styles/types.js";
import { customBlocksTestCases } from "../../testUtil/cases/customBlocks.js";
import { customInlineContentTestCases } from "../../testUtil/cases/customInlineContent.js";
import { customStylesTestCases } from "../../testUtil/cases/customStyles.js";
import { defaultSchemaTestCases } from "../../testUtil/cases/defaultSchema.js";
import { partialBlocksToBlocksForTesting } from "../../testUtil/partialBlockTestUtil.js";

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
  const fullBlocks = partialBlocksToBlocksForTesting(editor.schema, blocks);
  const md = await editor.blocksToMarkdownLossy(fullBlocks);
  const snapshotPath =
    "./__snapshots__/" +
    snapshotDirectory +
    "/" +
    snapshotName +
    "/markdown.md";

  // vitest empty snapshots are broken on CI. might be fixed on next vitest, use workaround for now
  if (!md.length && process.env.CI) {
    if (
      fs.readFileSync(path.join(__dirname, snapshotPath), "utf8").length === 0
    ) {
      // both are empty, so it's fine
      return;
    }
  }
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
      const div = document.createElement("div");

      beforeEach(() => {
        editor = testCase.createEditor();
        editor.mount(div);
      });

      afterEach(() => {
        editor.mount(undefined);
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
