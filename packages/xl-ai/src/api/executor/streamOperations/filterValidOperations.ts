import {
  BlockNoteOperation,
  InvalidOrOk,
} from "../../functions/blocknoteFunctions.js";

/**
 * Filters out invalid operations from the stream.
 */
export async function* filterValidOperations<
  T extends {
    operation: InvalidOrOk<BlockNoteOperation>;
    isUpdateToPreviousOperation: boolean;
    isPossiblyPartial: boolean;
  }
>(
  operationsStream: AsyncIterable<T>
): AsyncGenerator<{
  operation: BlockNoteOperation;
  isUpdateToPreviousOperation: boolean;
  isPossiblyPartial: boolean;
}> {
  for await (const chunk of operationsStream) {
    if (chunk.operation.result === "ok") {
      yield {
        operation: chunk.operation.value,
        isUpdateToPreviousOperation: chunk.isUpdateToPreviousOperation,
        isPossiblyPartial: chunk.isPossiblyPartial,
      };
    } else {
      // console.error("invalid operation", chunk.operation.reason);
    }
  }
}
