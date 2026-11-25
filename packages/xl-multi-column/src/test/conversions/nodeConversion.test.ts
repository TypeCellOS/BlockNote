import { blockToNode, nodeToBlock } from "@blocknote/core";
import { describe, expect } from "vite-plus/test";

import { testEditorSchema } from "../setupTestEnv.js";
import { multiColumnSchemaTestCases } from "./testCases.js";

describe("Test BlockNote-Prosemirror conversion", () => {
  describe("Case: " + multiColumnSchemaTestCases.name, () => {
    it.for(multiColumnSchemaTestCases.documents)(
      "Convert $name to/from prosemirror",
      async (
        { blocks },
        { addIdsToBlocks, partialBlockToBlockForTesting, setupEditor },
      ) => {
        const { editor } = await setupEditor({ schema: testEditorSchema });
        // Only the first block is converted by this round trip.
        const block = structuredClone(blocks[0]);
        addIdsToBlocks([block]);
        const node = blockToNode(block, editor.pmSchema);

        expect(node).toMatchSnapshot();

        const outputBlock = editor.transact(({ doc }) =>
          nodeToBlock(node, doc),
        );
        expect(outputBlock).toStrictEqual(
          partialBlockToBlockForTesting(editor.schema.blockSchema, block),
        );
      },
    );
  });
});
