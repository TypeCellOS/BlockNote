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
  }>,
  onInvalidOperation?: (
    operation: Result<T> & {
      ok: false;
    },
  ) => void,
): AsyncGenerator<{
  operation: T;
  isUpdateToPreviousOperation: boolean;
  isPossiblyPartial: boolean;
}> {
  let forceNewOperation = false;
  for await (const chunk of operationsStream) {
    if (chunk.operation.ok) {
      yield {
        operation: chunk.operation.value,
        isUpdateToPreviousOperation: forceNewOperation
          ? false
          : chunk.isUpdateToPreviousOperation,
        isPossiblyPartial: chunk.isPossiblyPartial,
      };
      forceNewOperation = false;
    } else {
      forceNewOperation =
        forceNewOperation || !chunk.isUpdateToPreviousOperation;
      onInvalidOperation?.(chunk.operation);
    }
  }
}
