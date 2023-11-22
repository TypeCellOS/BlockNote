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
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { customReactBlockSchemaTestCases } from "./testCases/customReactBlocks";
import { customReactStylesTestCases } from "./testCases/customReactStyles";

function convertToHTMLAndCompareSnapshots<
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<B, I, S>,
  blocks: PartialBlock<B, I, S>[],
  snapshotDirectory: string,
  snapshotName: string
) {
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

const testCases = [customReactBlockSchemaTestCases, customReactStylesTestCases];

describe("Test React HTML conversion", () => {
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
        it("Convert " + document.name + " to HTML", () => {
          const nameSplit = document.name.split("/");
          convertToHTMLAndCompareSnapshots(
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

it("test react render", () => {
  const div = document.createElement("div");
  const root = createRoot(div);
  function hello(el: HTMLElement | null) {
    console.log("ELEMENT", el?.innerHTML);
  }
  flushSync(() => {
    root.render(<div ref={hello}>sdf</div>);
  });
});
