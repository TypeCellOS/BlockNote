import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  PartialBlock,
  StyleSchema,
} from "@blocknote/core";
import {
  addIdsToBlocks,
  partialBlocksToBlocksForTesting,
} from "@shared/formatConversionTestUtil.js";
import { describe, expect } from "vite-plus/test";

import { testEditorSchema } from "../setupTestEnv.js";
import { multiColumnSchemaTestCases } from "./testCases.js";

function normalizeColumnStyles(html: string) {
  const template = document.createElement("template");
  template.innerHTML = html;
  // Firefox serializes styles in CSSOM write order; Chromium and WebKit may
  // append them after later data attributes. Keep one snapshot across engines.
  for (const column of template.content.querySelectorAll(
    ".bn-block-column-list[style], .bn-block-column[style]",
  )) {
    const style = column.getAttribute("style")!;
    column.removeAttribute("style");
    column.setAttribute("style", style);
  }
  return template.innerHTML;
}

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
  const internalHTML = editor.blocksToFullHTML(blocks);
  const internalHTMLSnapshotPath =
    "./__snapshots__/" +
    snapshotDirectory +
    "/" +
    snapshotName +
    "/internal.html";
  await expect(normalizeColumnStyles(internalHTML)).toMatchFileSnapshot(
    internalHTMLSnapshotPath,
  );

  // turn the internalHTML back into blocks, and make sure no data was lost
  const fullBlocks = partialBlocksToBlocksForTesting(editor.schema, blocks);
  const parsed = editor.tryParseHTMLToBlocks(internalHTML);

  expect(parsed).toStrictEqual(fullBlocks);

  // Create the "external" HTML, which is a cleaned up HTML representation, but lossy
  const externalHTML = editor.blocksToHTMLLossy(blocks);
  const externalHTMLSnapshotPath =
    "./__snapshots__/" +
    snapshotDirectory +
    "/" +
    snapshotName +
    "/external.html";
  await expect(normalizeColumnStyles(externalHTML)).toMatchFileSnapshot(
    externalHTMLSnapshotPath,
  );
}

const testCases = [multiColumnSchemaTestCases];

describe("Test multi-column HTML conversion", () => {
  for (const testCase of testCases) {
    describe("Case: " + testCase.name, () => {
      for (const document of testCase.documents) {
        // eslint-disable-next-line no-loop-func
        it("Convert " + document.name + " to HTML", async ({ setupEditor }) => {
          const { editor } = await setupEditor({
            mountType: false,
            schema: testEditorSchema,
          });
          const nameSplit = document.name.split("/");
          await convertToHTMLAndCompareSnapshots(
            editor,
            structuredClone(document.blocks),
            nameSplit[0],
            nameSplit[1],
          );
        });
      }
    });
  }
});
