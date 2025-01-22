import { BlockNoteEditor } from "@blocknote/core";
import { AIFunction } from "../functions/index.js";

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
    console.log("INVALID OPERATION", operation);
    return operationContext;
  }
  return func.apply(operation, editor, operationContext, options);
}

type AsyncIterableStream<T> = AsyncIterable<T> & ReadableStream<T>;

export async function executeAIOperationStream(
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
