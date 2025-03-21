import { BlockNoteEditor } from "@blocknote/core";
import { BlockNoteOperation } from "../functions/blocknoteFunctions.js";
import { AIFunction } from "../functions/index.js";
import {
  applyOperations,
  duplicateInsertsToUpdates,
  filterValidOperations,
  toBlockNoteOperations,
} from "./streamOperations/index.js";

export type ExecuteOperationResult = {
  operation: BlockNoteOperation;
  result: "ok";
  lastBlockId: string;
};

// Compose the generators
export async function* executeOperations(
  editor: BlockNoteEditor,
  operationsStream: AsyncIterable<{
    partialOperation: any;
    isUpdateToPreviousOperation: boolean;
    isPossiblyPartial: boolean;
  }>,
  functions: AIFunction[]
): AsyncGenerator<ExecuteOperationResult> {
  // to blocknote operations
  const blockNoteOperationsStream = toBlockNoteOperations(
    editor,
    operationsStream,
    functions
  );

  // filter valid operations
  const validOperationsStream = filterValidOperations(
    blockNoteOperationsStream
  );

  // duplicate inserts to updates
  const duplicateInsertsToUpdatesStream = duplicateInsertsToUpdates(
    validOperationsStream
  );

  // apply operations
  const appliedOperationsStream = applyOperations(
    editor,
    duplicateInsertsToUpdatesStream
  );

  // yield results
  yield* appliedOperationsStream;
}

// - cursor position
// - API design (customize context, cursor position, prompt, stream / nostream, validation)
