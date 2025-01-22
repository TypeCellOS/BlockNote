import { BlockNoteEditor } from "@blocknote/core";

import { Block } from "@blocknote/core";
import { MarkdownNodeDiffResult } from "./markdownNodeDiff.js";
import { markdownUpdateToBlockUpdate } from "./markdownUpdate.js";
import { markdownNodeToString } from "./util.js";

function flattenBlocks(blocks: Block<any, any, any>[]): Block<any, any, any>[] {
  return blocks.flatMap((block) => {
    return [block, ...flattenBlocks(block.children)];
  });
}

/**
 * Takes a list of markdown node diffs and converts them into a list of block operations
 * to perform on the blocks to get to the target markdown
 */
export async function markdownNodeDiffToBlockOperations(
  editor: BlockNoteEditor<any, any, any>,
  blocks: Block<any, any, any>[],
  markdownNodeDiff: MarkdownNodeDiffResult[]
) {
  const operations: any[] = [];

  blocks = flattenBlocks(blocks);
  if (
    markdownNodeDiff.filter((diff) => diff.type !== "add").length !==
    blocks.length
  ) {
    throw new Error(
      "Number of nodes in markdown diff does not match number of blocks"
    );
  }

  let lastBlockId: string | undefined;
  let currentBlockIndex = 0;

  for (const diff of markdownNodeDiff) {
    if (diff.type === "add") {
      const blocks = await editor.tryParseMarkdownToBlocks(
        markdownNodeToString(diff.newBlock)
      );

      if (blocks.length !== 1) {
        throw new Error("Expected single block to be added");
      }

      const block = blocks[0];

      // new node has been added
      if (
        operations.length > 0 &&
        operations[operations.length - 1].type === "add"
      ) {
        // add to previous "add operation" (add can be a list of blocks)
        operations[operations.length - 1].blocks.push(block);
      } else {
        const positionInfo =
          currentBlockIndex < blocks.length
            ? {
                position: "before",
                referenceId: blocks[currentBlockIndex].id,
              }
            : {
                position: "after",
                referenceId: lastBlockId,
              };

        operations.push({
          type: "add",
          ...positionInfo,
          blocks: [block],
        });
      }
    } else if (diff.type === "remove") {
      // remove block
      operations.push({
        type: "delete",
        id: blocks[currentBlockIndex].id,
      });
      currentBlockIndex++;
    } else if (diff.type === "unchanged") {
      lastBlockId = blocks[currentBlockIndex].id;
      currentBlockIndex++;
    } else if (diff.type === "changed") {
      // a block has been changed, get the update operation
      lastBlockId = blocks[currentBlockIndex].id;

      const update = await markdownUpdateToBlockUpdate(
        editor,
        blocks[currentBlockIndex],
        markdownNodeToString(diff.oldBlock),
        markdownNodeToString(diff.newBlock)
      );
      operations.push({
        type: "update",
        id: blocks[currentBlockIndex].id,
        block: update,
      });
      currentBlockIndex++;
    }
  }
  return operations;
}
