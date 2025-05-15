import { Result, StreamTool, StreamToolCall } from "./streamTool.js";

/**
 * Transforms the partialObjectStream into a stream of operations (tool calls), or indicates that the operation is invalid.
 *
 * Invalid operations can happen because:
 * a) the LLM produces an invalid result
 * b) the "partial" operation doesn't have enough data yet to execute
 */
export async function* toValidatedOperations<T extends StreamTool<any>[]>(
  partialObjectStream: AsyncIterable<{
    partialOperation: any;
    isUpdateToPreviousOperation: boolean;
    isPossiblyPartial: boolean;
  }>,
  streamTools: T,
): AsyncGenerator<{
  operation: Result<StreamToolCall<T>>;
  isUpdateToPreviousOperation: boolean;
  isPossiblyPartial: boolean;
}> {
  for await (const chunk of partialObjectStream) {
    const func = streamTools.find(
      (f) => f.name === chunk.partialOperation.type,
    )!;

    if (!func) {
      // Skip operations with no matching function
      // console.error("no matching function", chunk.partialOperation);
      yield {
        operation: {
          ok: false,
          error: `No matching function for ${chunk.partialOperation.type}`,
        },
        isUpdateToPreviousOperation: chunk.isUpdateToPreviousOperation,
        isPossiblyPartial: chunk.isPossiblyPartial,
      };
      continue;
    }

    const operation = func.validate(chunk.partialOperation);

    yield {
      operation,
      isUpdateToPreviousOperation: chunk.isUpdateToPreviousOperation,
      isPossiblyPartial: chunk.isPossiblyPartial,
    };
  }
}
