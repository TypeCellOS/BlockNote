import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  BlockNoteEditor,
  PartialBlock,
  UniqueID,
  blockToNode,
  nodeToBlock,
} from "@blocknote/core";
import { partialBlockToBlockForTesting } from "@shared/formatConversionTestUtil.js";

import { multiColumnSchemaTestCases } from "./testCases.js";

function addIdsToBlock(block: PartialBlock<any, any, any>) {
  if (!block.id) {
    block.id = UniqueID.options.generateID();
  }
  for (const child of block.children || []) {
    addIdsToBlock(child);
  }
}

function validateConversion(
  block: PartialBlock<any, any, any>,
  editor: BlockNoteEditor<any, any, any>,
) {
  addIdsToBlock(block);
  const node = blockToNode(block, editor.pmSchema);

  expect(node).toMatchSnapshot();

  const outputBlock = nodeToBlock(node, editor.pmSchema);

  const fullOriginalBlock = partialBlockToBlockForTesting(
    editor.schema.blockSchema,
    block,
  );

  expect(outputBlock).toStrictEqual(fullOriginalBlock);
}

const testCases = [multiColumnSchemaTestCases];

describe("Test BlockNote-Prosemirror conversion", () => {
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
        it("Convert " + document.name + " to/from prosemirror", () => {
          // NOTE: only converts first block
          validateConversion(document.blocks[0], editor);
        });
      }
    });
  }
});
