/**
 * This takes the partialObjectStream from an LLM streaming response.
 *
 * Note that this streams in multiple operations in the operations array, and this will be called with chunks like this:
 *
 * {operations: [op1, op2partial]}
 * {operations: [op1, op2complete, op3, op4]}
 *
 * This function transforms it into a stream of new or updated operations, so the output would be like this:
 *
 * {newOrUpdatedOperations: [op1, op2partial]}
 * {newOrUpdatedOperations: [op2complete, op3, op4]}
 */
export async function* filterNewOrUpdatedOperations(
  partialObjectStream: AsyncIterable<{
    operations?: any[];
  }>
): AsyncGenerator<{
  partialOperation: any;
  isUpdateToPreviousOperation: boolean;
  isPossiblyPartial: boolean;
}> {
  let numOperationsAppliedCompletely = 0;
  let first = true;

  let lastOp: any;

  for await (const chunk of partialObjectStream) {
    if (!chunk.operations?.length) {
      // yield { newOrUpdatedOperations: [] };
      continue;
    }

    for (
      let i = numOperationsAppliedCompletely;
      i < chunk.operations.length;
      i++
    ) {
      const operation = chunk.operations[i];
      lastOp = operation;
      yield {
        partialOperation: operation,
        isUpdateToPreviousOperation:
          i === numOperationsAppliedCompletely && !first,
        isPossiblyPartial: i === chunk.operations.length - 1,
      };
      first = false;
    }

    // Update count to exclude the last operation which might be incomplete
    numOperationsAppliedCompletely = chunk.operations.length - 1;
  }

  if (!lastOp) {
    throw new Error("No operations seen");
  }

  // mark final operation as final (by emitting with isPossiblyPartial: false)
  yield {
    partialOperation: lastOp,
    isUpdateToPreviousOperation: true,
    isPossiblyPartial: false,
  };
}
