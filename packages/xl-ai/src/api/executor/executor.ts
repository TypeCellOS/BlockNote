import { BlockNoteEditor } from "@blocknote/core";
import { AIFunction } from "../functions/index.js";
import { AsyncIterableStream } from "../util/stream.js";

export function executeAIOperation(
  operation: any,
  editor: BlockNoteEditor,
  functions: AIFunction[],
  operationContext: any,
  options: {
    idsSuffixed: boolean;
  } = {
    idsSuffixed: false,
  }
) {
  const func = functions.find((func) => func.schema.name === operation.type);
  if (!func || !func.validate(operation, editor, options)) {
    // TODO?
    // eslint-disable-next-line no-console
    console.log("INVALID OPERATION", operation);
    return operationContext;
  }
  return func.apply(operation, editor, operationContext, options);
}

// Internal async generator function to process operations
export async function* processOperations(
  editor: BlockNoteEditor,
  operationsStream: AsyncIterable<{
    operations?: any[];
  }>,
  functions: AIFunction[]
): AsyncGenerator<{
  operations?: any[];
  results: any[];
}> {
  let numOperationsAppliedCompletely = 0;
  let operationContext: any = undefined;

  for await (const partialObject of operationsStream) {
    const operations = partialObject.operations || [];
    // console.log(operations);
    let isFirst = true;
    for (const operation of operations.slice(numOperationsAppliedCompletely)) {
      operationContext = executeAIOperation(
        operation,
        editor,
        functions,
        isFirst ? operationContext : undefined,
        { idsSuffixed: true }
      );
      isFirst = false;
    }
    yield { operations, results: [operationContext] };

    numOperationsAppliedCompletely = operations.length - 1;
  }
}

// Legacy version for backward compatibility
export async function executeAIOperationStreamLegacy(
  editor: BlockNoteEditor,
  operationsStream: AsyncIterableStream<{
    operations?: any[];
  }>,
  functions: AIFunction[]
) {
  let numOperationsAppliedCompletely = 0;
  let operationContext: any = undefined;

  for await (const partialObject of operationsStream) {
    const operations = partialObject.operations || [];
    // console.log(operations);
    let isFirst = true;
    for (const operation of operations.slice(numOperationsAppliedCompletely)) {
      operationContext = executeAIOperation(
        operation,
        editor,
        functions,
        isFirst ? operationContext : undefined,
        { idsSuffixed: true }
      );
      isFirst = false;
    }

    numOperationsAppliedCompletely = operations.length - 1;
  }
}

// - cursor position
// - API design (customize context, cursor position, prompt, stream / nostream, validation)
