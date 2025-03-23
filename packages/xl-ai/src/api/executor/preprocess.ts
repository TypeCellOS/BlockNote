import { BlockNoteEditor } from "@blocknote/core";

import { BlockNoteOperation } from "../functions/blocknoteFunctions.js";
import { LLMFunction } from "../functions/function.js";
import {
  filterValidOperations,
  toValidatedOperations,
} from "./streamOperations/index.js";

export type PreprocessOperationResult<T> = {
  operation: T;
  isUpdateToPreviousOperation: boolean;
  isPossiblyPartial: boolean;
};

export async function* preprocessOperationsStreaming<
  T extends BlockNoteOperation<any> // TODO: rename blocknoteoperation?
>(
  editor: BlockNoteEditor,
  operationsStream: AsyncIterable<{
    partialOperation: T;
    isUpdateToPreviousOperation: boolean;
    isPossiblyPartial: boolean;
  }>,
  functions: LLMFunction<T>[]
): AsyncGenerator<PreprocessOperationResult<T>> {
  // TODO: add filterNewOrUpdatedOperations here?

  // from partial operations to valid / invalid operations
  const validatedOperationsStream = toValidatedOperations(
    editor,
    operationsStream,
    functions
  );

  // filter valid operations, invalid operations are ignored
  const validOperationsStream = filterValidOperations(
    validatedOperationsStream
  );

  yield* validOperationsStream;

  // duplicate inserts to updates
  // const duplicateInsertsToUpdatesStream = duplicateInsertsToUpdates(
  //   validOperationsStream
  // );

  // // yield results
  // yield* duplicateInsertsToUpdatesStream;
}

export async function* preprocessOperationsNonStreaming<T>(
  editor: BlockNoteEditor,
  operationsStream: AsyncIterable<{
    partialOperation: T;
    isUpdateToPreviousOperation: boolean;
    isPossiblyPartial: boolean;
  }>,
  functions: LLMFunction<BlockNoteOperation<T>>[]
): AsyncGenerator<PreprocessOperationResult<BlockNoteOperation<T>>> {
  // from partial operations to valid / invalid operations
  const validatedOperationsStream = toValidatedOperations(
    editor,
    operationsStream,
    functions
  );

  // filter valid operations, invalid operations should throw an error
  const validOperationsStream = filterValidOperations(
    validatedOperationsStream,
    (operation) => {
      throw new Error("invalid operation: " + operation.reason);
    }
  );

  // yield results
  yield* validOperationsStream;
}

// - cursor position
// - API design (customize context, cursor position, prompt, stream / nostream, validation)
