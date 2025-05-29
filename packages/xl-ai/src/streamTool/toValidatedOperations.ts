import { Result, StreamTool, StreamToolCall } from "./streamTool.js";

export function validateOperation<T extends StreamTool<any>[]>(
  partialOperation: unknown,
  streamTools: T,
): Result<StreamToolCall<T>> {
  if (
    !partialOperation ||
    typeof partialOperation !== "object" ||
    !("type" in partialOperation)
  ) {
    return {
      ok: false,
      error: "Partial operation is not an object",
    };
  }
  const func = streamTools.find((f) => f.name === partialOperation.type);

  if (!func) {
    return {
      ok: false,
      error: `No matching function for ${partialOperation.type}`,
    };
  }

  return func.validate(partialOperation);
}

/**
 * Transforms the partialObjectStream into a stream of operations (tool calls), or indicates that the operation is invalid.
 *
 * Invalid operations can happen because:
 * a) the LLM produces an invalid result
 * b) the "partial" operation doesn't have enough data yet to execute
 */
export async function* toValidatedOperations<T extends StreamTool<any>[]>(
  partialObjectStream: AsyncIterable<{
    operation: any;
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
    const result = validateOperation(chunk.operation, streamTools);

    yield {
      operation: result,
      isUpdateToPreviousOperation: chunk.isUpdateToPreviousOperation,
      isPossiblyPartial: chunk.isPossiblyPartial,
    };
  }
}
