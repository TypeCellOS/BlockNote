import { Result } from "./streamTool.js";

/**
 * Yields only valid operations from the stream.
 *
 * For invalid operations, the `onInvalidOperation` callback is called.
 */
export async function* filterValidOperations<T>(
  operationsStream: AsyncIterable<{
    operation: Result<T>;
    isUpdateToPreviousOperation: boolean;
    isPossiblyPartial: boolean;
    metadata: any;
  }>,
  onInvalidOperation?: (chunk: {
    operation: Result<T> & {
      ok: false;
    };
    isUpdateToPreviousOperation: boolean;
    isPossiblyPartial: boolean;
    metadata: any;
  }) => void,
): AsyncGenerator<{
  operation: T;
  isUpdateToPreviousOperation: boolean;
  isPossiblyPartial: boolean;
  metadata: any;
}> {
  let forceNewOperation = false;
  for await (const chunk of operationsStream) {
    const operation = chunk.operation;
    if (operation.ok) {
      yield {
        operation: operation.value,
        isUpdateToPreviousOperation: forceNewOperation
          ? false
          : chunk.isUpdateToPreviousOperation,
        isPossiblyPartial: chunk.isPossiblyPartial,
        metadata: chunk.metadata,
      };
      forceNewOperation = false;
    } else {
      forceNewOperation =
        forceNewOperation || !chunk.isUpdateToPreviousOperation;
      onInvalidOperation?.({
        ...chunk,
        operation,
      });
    }
  }
}
