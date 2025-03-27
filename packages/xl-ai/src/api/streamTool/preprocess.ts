import { BlockNoteEditor } from "@blocknote/core";

import {
  filterValidOperations,
  toValidatedOperations,
} from "../executor/streamOperations/index.js";
import { StreamTool, StreamToolCall } from "./streamTool.js";

export type PreprocessOperationResult<T extends StreamTool<any>[]> = {
  operation: StreamToolCall<T>;
  isUpdateToPreviousOperation: boolean;
  isPossiblyPartial: boolean;
};

export async function* preprocessOperationsStreaming<
  T extends StreamTool<any>[]
>(
  editor: BlockNoteEditor,
  operationsStream: AsyncIterable<{
    partialOperation: any;
    isUpdateToPreviousOperation: boolean;
    isPossiblyPartial: boolean;
  }>,
  streamTools: T
): AsyncGenerator<PreprocessOperationResult<T>> {
  // from partial operations to valid / invalid operations
  const validatedOperationsStream = toValidatedOperations(
    editor,
    operationsStream,
    streamTools
  );

  // filter valid operations, invalid operations are ignored
  const validOperationsStream = filterValidOperations(
    validatedOperationsStream
  );

  yield* validOperationsStream;
}

export async function* preprocessOperationsNonStreaming<
  T extends StreamTool<any>[]
>(
  editor: BlockNoteEditor,
  operationsStream: AsyncIterable<{
    partialOperation: any;
    isUpdateToPreviousOperation: boolean;
    isPossiblyPartial: boolean;
  }>,
  streamTools: T
): AsyncGenerator<PreprocessOperationResult<T>> {
  // from partial operations to valid / invalid operations
  const validatedOperationsStream = toValidatedOperations(
    editor,
    operationsStream,
    streamTools
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
