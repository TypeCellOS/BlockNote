import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  BlockNoteEditor,
  PartialBlock,
  UniqueID,
  blockToNode,
  nodeToBlock,
  partialBlockToBlockForTesting,
} from "@blocknote/core";
import { customReactBlockSchemaTestCases } from "./testCases/customReactBlocks";
import { customReactInlineContentTestCases } from "./testCases/customReactInlineContent";
import { customReactStylesTestCases } from "./testCases/customReactStyles";

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
  editor: BlockNoteEditor<any, any, any>
) {
  addIdsToBlock(block);
  const node = blockToNode(
    block,
    editor._tiptapEditor.schema,
    editor.styleSchema
  );

  expect(node).toMatchSnapshot();

  const outputBlock = nodeToBlock(
    node,
    editor.blockSchema,
    editor.inlineContentSchema,
    editor.styleSchema
  );

  const fullOriginalBlock = partialBlockToBlockForTesting(
    editor.blockSchema,
    block
  );

  expect(outputBlock).toStrictEqual(fullOriginalBlock);
}

const testCases = [
  customReactBlockSchemaTestCases,
  customReactStylesTestCases,
  customReactInlineContentTestCases,
];

describe("Test React BlockNote-Prosemirror conversion", () => {
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
        it("Convert " + document.name + " to/from prosemirror", () => {
          // NOTE: only converts first block
          validateConversion(document.blocks[0], editor);
        });
      }
    });
  }
});
