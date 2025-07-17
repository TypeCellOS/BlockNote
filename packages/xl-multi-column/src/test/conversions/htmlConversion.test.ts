// @vitest-environment jsdom

import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  PartialBlock,
  StyleSchema,
  createExternalHTMLExporter,
  createInternalHTMLSerializer,
} from "@blocknote/core";
import {
  addIdsToBlocks,
  partialBlocksToBlocksForTesting,
} from "@shared/formatConversionTestUtil.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { multiColumnSchemaTestCases } from "./testCases.js";

// TODO: code same from @blocknote/core, maybe create separate test util package
async function convertToHTMLAndCompareSnapshots<
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<B, I, S>,
  blocks: PartialBlock<B, I, S>[],
  snapshotDirectory: string,
  snapshotName: string,
) {
  addIdsToBlocks(blocks);
  const serializer = createInternalHTMLSerializer(editor.pmSchema, editor);
  const internalHTML = serializer.serializeBlocks(blocks, {});
  const internalHTMLSnapshotPath =
    "./__snapshots__/" +
    snapshotDirectory +
    "/" +
    snapshotName +
    "/internal.html";
  await expect(internalHTML).toMatchFileSnapshot(internalHTMLSnapshotPath);

  // turn the internalHTML back into blocks, and make sure no data was lost
  const fullBlocks = partialBlocksToBlocksForTesting(editor.schema, blocks);
  const parsed = await editor.tryParseHTMLToBlocks(internalHTML);

  expect(parsed).toStrictEqual(fullBlocks);

  // Create the "external" HTML, which is a cleaned up HTML representation, but lossy
  const exporter = createExternalHTMLExporter(editor.pmSchema, editor);
  const externalHTML = exporter.exportBlocks(blocks, {});
  const externalHTMLSnapshotPath =
    "./__snapshots__/" +
    snapshotDirectory +
    "/" +
    snapshotName +
    "/external.html";
  await expect(externalHTML).toMatchFileSnapshot(externalHTMLSnapshotPath);
}

const testCases = [multiColumnSchemaTestCases];

describe("Test multi-column HTML conversion", () => {
  for (const testCase of testCases) {
    describe("Case: " + testCase.name, () => {
      let editor: BlockNoteEditor<any, any, any>;
      const div = document.createElement("div");
      beforeEach(() => {
        editor = testCase.createEditor();

        // Note that we don't necessarily need to mount a root
        // Currently, we do mount to a root so that it reflects the "production" use-case more closely.

        // However, it would be nice to increased converage and share the same set of tests for these cases:
        // - does render to a root
        // - does not render to a root
        // - runs in server (jsdom) environment using server-util
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
          await convertToHTMLAndCompareSnapshots(
            editor,
            document.blocks,
            nameSplit[0],
            nameSplit[1],
          );
        });
      }
    });
  }
});
