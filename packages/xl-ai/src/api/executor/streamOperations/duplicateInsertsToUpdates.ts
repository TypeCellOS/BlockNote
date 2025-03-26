import { PartialBlock, UniqueID } from "@blocknote/core";

import { StreamToolCall } from "../../streamTool/streamTool.js";
import { AddBlocksToolCall } from "../../tools/createAddBlocksTool.js";
import { UpdateBlockToolCall } from "../../tools/createUpdateBlockTool.js";

function isBuiltInAddBlocksToolCall(
  operation: unknown
): operation is AddBlocksToolCall<PartialBlock<any, any, any>> {
  return (
    typeof operation === "object" &&
    operation !== null &&
    "type" in operation &&
    operation.type === "add"
  );
}

/**
 * Handles the case where an insert operation is updated in subsequent chunks.
 * This function converts insert operations to update operations for blocks that were already inserted,
 * and handles new blocks that need to be inserted.
 */
export async function* duplicateInsertsToUpdates<
  T extends
    | UpdateBlockToolCall<PartialBlock<any, any, any>>
    | AddBlocksToolCall<PartialBlock<any, any, any>>
    | StreamToolCall<any>
>(
  operationsStream: AsyncIterable<{
    operation: T;
    isUpdateToPreviousOperation: boolean;
    isPossiblyPartial: boolean;
  }>
): AsyncGenerator<{
  operation: T;
  isUpdateToPreviousOperation: boolean;
  isPossiblyPartial: boolean;
}> {
  let insertedIds: string[] = [];
  for await (const chunk of operationsStream) {
    if (
      !isBuiltInAddBlocksToolCall(chunk.operation) ||
      (!chunk.isPossiblyPartial && !chunk.isUpdateToPreviousOperation)
    ) {
      insertedIds = [];
      yield chunk;
      continue;
    }

    if (!chunk.isUpdateToPreviousOperation) {
      insertedIds = [];
    }

    const toUpdate = chunk.operation.blocks.slice(0, insertedIds.length);

    for (let i = 0; i < toUpdate.length; i++) {
      // instead of inserting the block, we're updating the block that was inserted in a previous call

      // TODO: would be better to not issue updates for unchanged blocks
      yield {
        ...chunk,
        operation: {
          type: "update",
          id: insertedIds[i],
          block: toUpdate[i],
        } as T,
      };
    }

    const toAdd = chunk.operation.blocks.slice(insertedIds.length);
    if (toAdd.length > 0) {
      for (const block of toAdd) {
        if (typeof block.id !== "undefined") {
          throw new Error("unexpected, block has id");
        }
        block.id = UniqueID.options.generateID();
      }

      if (toUpdate.length === 0) {
        yield {
          ...chunk,
          operation: {
            ...chunk.operation,
            blocks: toAdd,
          },
        };
      } else {
        // insert after the last inserted block part of this operation
        yield {
          ...chunk,
          operation: {
            ...chunk.operation,
            position: "after",
            referenceId: insertedIds[insertedIds.length - 1],
            blocks: toAdd,
          },
        };
      }
      insertedIds = [...insertedIds, ...toAdd.map((block) => block.id!)];
    }
  }
}
