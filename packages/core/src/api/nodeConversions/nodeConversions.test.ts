import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { BlockNoteEditor } from "../../BlockNoteEditor";
import { PartialBlock } from "../../extensions/Blocks/api/blocks/types";
import UniqueID from "../../extensions/UniqueID/UniqueID";
import { customInlineContentTestCases } from "../testCases/cases/customInlineContent";
import { customStylesTestCases } from "../testCases/cases/customStyles";
import { defaultSchemaTestCases } from "../testCases/cases/defaultSchema";
import { blockToNode, nodeToBlock } from "./nodeConversions";
import { partialBlockToBlockForTesting } from "./testUtil";

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
  defaultSchemaTestCases,
  customStylesTestCases,
  customInlineContentTestCases,
];

describe("Test BlockNote-Prosemirror conversion", () => {
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
