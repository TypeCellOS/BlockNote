import { getErrorMessage } from "@ai-sdk/provider-utils";
import { ChunkExecutionError } from "./ChunkExecutionError.js";
import { filterValidOperations } from "./filterValidOperations.js";
import { StreamTool, StreamToolCall } from "./streamTool.js";
import { toValidatedOperations } from "./toValidatedOperations.js";

export type PreprocessOperationResult<T extends StreamTool<any>[]> = {
  operation: StreamToolCall<T>;
  isUpdateToPreviousOperation: boolean;
  isPossiblyPartial: boolean;
  metadata: any;
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
    metadata: any;
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
        throw new ChunkExecutionError(
          `Invalid operation. ${getErrorMessage(chunk.operation.error)}`,
          chunk,
          {
            cause: chunk.operation.error,
          },
        );
      }
    },
  );

  yield* validOperationsStream;
}
