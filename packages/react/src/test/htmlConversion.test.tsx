// @vitest-environment jsdom

import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  PartialBlock,
  StyleSchema,
  addIdsToBlocks,
  createExternalHTMLExporter,
  createInternalHTMLSerializer,
  initializeESMDependencies,
  partialBlocksToBlocksForTesting,
} from "@blocknote/core";

import { flushSync } from "react-dom";
import { Root, createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BlockNoteViewRaw } from "../editor/BlockNoteView";
import {
  TestContext,
  customReactBlockSchemaTestCases,
} from "./testCases/customReactBlocks";
import { customReactInlineContentTestCases } from "./testCases/customReactInlineContent";
import { customReactStylesTestCases } from "./testCases/customReactStyles";

// TODO: code same from @blocknote/core, maybe create separate test util package
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
  const serializer = createInternalHTMLSerializer(editor.pmSchema, editor);
  const internalHTML = serializer.serializeBlocks(blocks, {});
  const internalHTMLSnapshotPath =
    "./__snapshots__/" +
    snapshotDirectory +
    "/" +
    snapshotName +
    "/internal.html";
  expect(internalHTML).toMatchFileSnapshot(internalHTMLSnapshotPath);

  // turn the internalHTML back into blocks, and make sure no data was lost
  const fullBlocks = partialBlocksToBlocksForTesting(
    editor.schema.blockSchema,
    blocks
  );
  const parsed = await editor.tryParseHTMLToBlocks(internalHTML);

  expect(parsed).toStrictEqual(fullBlocks);

  // Create the "external" HTML, which is a cleaned up HTML representation, but lossy
  await initializeESMDependencies();
  const exporter = createExternalHTMLExporter(editor.pmSchema, editor);
  const externalHTML = exporter.exportBlocks(blocks, {});
  const externalHTMLSnapshotPath =
    "./__snapshots__/" +
    snapshotDirectory +
    "/" +
    snapshotName +
    "/external.html";
  expect(externalHTML).toMatchFileSnapshot(externalHTMLSnapshotPath);
}

const testCases = [
  customReactBlockSchemaTestCases,
  customReactStylesTestCases,
  customReactInlineContentTestCases,
];

describe("Test React HTML conversion", () => {
  for (const testCase of testCases) {
    describe("Case: " + testCase.name, () => {
      let editor: BlockNoteEditor<any, any, any>;
      // Note that we don't necessarily need to mount a root (unless we need a React Context)
      // Currently, we do mount to a root so that it reflects the "production" use-case more closely.

      // However, it would be nice to increased converage and share the same set of tests for these cases:
      // - does render to a root
      // - does not render to a root
      // - runs in server (jsdom) environment using server-util
      let root: Root;
      const div = document.createElement("div");

      beforeEach(() => {
        editor = testCase.createEditor();

        const el = (
          <TestContext.Provider value={true}>
            <BlockNoteViewRaw editor={editor} />
          </TestContext.Provider>
        );
        root = createRoot(div);
        flushSync(() => {
          // eslint-disable-next-line testing-library/no-render-in-setup
          root.render(el);
        });
      });

      afterEach(() => {
        root.unmount();
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
