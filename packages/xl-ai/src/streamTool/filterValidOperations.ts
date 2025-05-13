import { InvalidOrOk } from "./streamTool.js";

/**
 * Yields only valid operations from the stream.
 *
 * For invalid operations, the `onInvalidOperation` callback is called.
 */
export async function* filterValidOperations<T>(
  operationsStream: AsyncIterable<{
    operation: InvalidOrOk<T>;
    isUpdateToPreviousOperation: boolean;
    isPossiblyPartial: boolean;
  }>,
  onInvalidOperation?: (
    operation: InvalidOrOk<T> & {
      result: "invalid";
    },
  ) => void,
): AsyncGenerator<{
  operation: T;
  isUpdateToPreviousOperation: boolean;
  isPossiblyPartial: boolean;
}> {
  let forceNewOperation = false;
  for await (const chunk of operationsStream) {
    if (chunk.operation.result === "ok") {
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
