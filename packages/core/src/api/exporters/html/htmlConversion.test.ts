import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BlockNoteEditor } from "../../../editor/BlockNoteEditor";

import { addIdsToBlocks, partialBlocksToBlocksForTesting } from "../../..";
import { BlockSchema, PartialBlock } from "../../../schema/blocks/types";
import { InlineContentSchema } from "../../../schema/inlineContent/types";
import { StyleSchema } from "../../../schema/styles/types";
import { customBlocksTestCases } from "../../testUtil/cases/customBlocks";
import { customInlineContentTestCases } from "../../testUtil/cases/customInlineContent";
import { customStylesTestCases } from "../../testUtil/cases/customStyles";
import { defaultSchemaTestCases } from "../../testUtil/cases/defaultSchema";
import { createExternalHTMLExporter } from "./externalHTMLExporter";
import { createInternalHTMLSerializer } from "./internalHTMLSerializer";

async function convertToHTMLAndCompareSnapshots<
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<B, I, S>,
  blocks: PartialBlock<B, I, S>[],
  snapshotDirectory: string,
  snapshotName: string
) {
  addIdsToBlocks(blocks);
  const serializer = createInternalHTMLSerializer(
    editor._tiptapEditor.schema,
    editor
  );
  const internalHTML = serializer.serializeBlocks(blocks);
  const internalHTMLSnapshotPath =
    "./__snapshots__/" +
    snapshotDirectory +
    "/" +
    snapshotName +
    "/internal.html";
  expect(internalHTML).toMatchFileSnapshot(internalHTMLSnapshotPath);

  // turn the internalHTML back into blocks, and make sure no data was lost
  const fullBlocks = partialBlocksToBlocksForTesting(
    editor.blockSchema,
    blocks
  );
  const parsed = await editor.tryParseHTMLToBlocks(internalHTML);

  expect(parsed).toStrictEqual(fullBlocks);

  // Create the "external" HTML, which is a cleaned up HTML representation, but lossy
  const exporter = createExternalHTMLExporter(
    editor._tiptapEditor.schema,
    editor
  );
  const externalHTML = exporter.exportBlocks(blocks);
  const externalHTMLSnapshotPath =
    "./__snapshots__/" +
    snapshotDirectory +
    "/" +
    snapshotName +
    "/external.html";
  expect(externalHTML).toMatchFileSnapshot(externalHTMLSnapshotPath);
}

const testCases = [
  defaultSchemaTestCases,
  customBlocksTestCases,
  customStylesTestCases,
  customInlineContentTestCases,
];

describe("Test HTML conversion", () => {
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
          await convertToHTMLAndCompareSnapshots(
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
