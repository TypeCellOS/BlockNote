import { BlockNoteEditor } from "@blocknote/core";
import {
  BlockNoteOperation,
  InvalidOrOk,
} from "../../functions/blocknoteFunctions.js";
import { AIFunction } from "../../functions/index.js";

/**
 * Transforms the partialObjectStream into a stream of BlockNoteOperations, or indicates that the operation is invalid.
 *
 * Invalid operations can happen because:
 * a) the LLM produces an invalid result
 * b) the "partial" operation doesn't have enough data yet to execute
 */
export async function* toBlockNoteOperations(
  editor: BlockNoteEditor,
  partialObjectStream: AsyncIterable<{
    partialOperation: any;
    isUpdateToPreviousOperation: boolean;
    isPossiblyPartial: boolean;
  }>,
  functions: AIFunction[]
): AsyncGenerator<{
  operation: InvalidOrOk<BlockNoteOperation>;
  isUpdateToPreviousOperation: boolean;
  isPossiblyPartial: boolean;
}> {
  for await (const chunk of partialObjectStream) {
    const func = functions.find(
      (f) => f.schema.name === chunk.partialOperation.type
    )!;

    if (!func) {
      // Skip operations with no matching function
      // console.error("no matching function", chunk.partialOperation);
      continue;
    }

    const operation = func.toBlockNoteOperation(
      chunk.partialOperation,
      editor,
      {
        idsSuffixed: true,
      }
    );

    yield {
      operation,
      isUpdateToPreviousOperation: chunk.isUpdateToPreviousOperation,
      isPossiblyPartial: chunk.isPossiblyPartial,
    };
  }
}
