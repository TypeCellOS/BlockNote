import { filterValidOperations } from "./filterValidOperations.js";
import { StreamTool, StreamToolCall } from "./streamTool.js";
import { toValidatedOperations } from "./toValidatedOperations.js";

export type PreprocessOperationResult<T extends StreamTool<any>[]> = {
  operation: StreamToolCall<T>;
  isUpdateToPreviousOperation: boolean;
  isPossiblyPartial: boolean;
};

/**
 * Validates an stream of operations and filters out invalid operations.
 */
export async function* preprocessOperationsStreaming<
  T extends StreamTool<any>[],
>(
  operationsStream: AsyncIterable<{
    partialOperation: any;
    isUpdateToPreviousOperation: boolean;
    isPossiblyPartial: boolean;
  }>,
  streamTools: T,
): AsyncGenerator<PreprocessOperationResult<T>> {
  // from partial operations to valid / invalid operations
  const validatedOperationsStream = toValidatedOperations(
    operationsStream,
    streamTools,
  );

  // filter valid operations, invalid partial operations are ignored
  const validOperationsStream = filterValidOperations(
    validatedOperationsStream,
    (chunk) => {
      if (!chunk.isPossiblyPartial) {
        // only throw if the operation is not possibly partial
        throw new Error("invalid operation: " + chunk.operation.error);
      }
    },
  );

  yield* validOperationsStream;
}

/**
 * Validates an stream of operations and throws an error if an invalid operation is found.
 */
export async function* preprocessOperationsNonStreaming<
  T extends StreamTool<any>[],
>(
  operationsStream: AsyncIterable<{
    partialOperation: any;
    isUpdateToPreviousOperation: boolean;
    isPossiblyPartial: boolean;
  }>,
  streamTools: T,
): AsyncGenerator<PreprocessOperationResult<T>> {
  // from partial operations to valid / invalid operations
  const validatedOperationsStream = toValidatedOperations(
    operationsStream,
    streamTools,
  );

  // filter valid operations, invalid operations should throw an error
  const validOperationsStream = filterValidOperations(
    validatedOperationsStream,
    (chunk) => {
      throw new Error("invalid operation: " + chunk.operation.error);
    },
  );

  // yield results
  yield* validOperationsStream;
}
