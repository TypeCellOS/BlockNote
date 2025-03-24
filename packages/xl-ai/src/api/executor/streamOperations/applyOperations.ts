import {
  BlockNoteEditor,
  PartialBlock,
  UnreachableCaseError,
} from "@blocknote/core";
import { applySuggestions } from "@handlewithcare/prosemirror-suggest-changes";
import { applyStepsAsAgent } from "../../../prosemirror/agent.js";
import { updateToReplaceSteps } from "../../../prosemirror/changeset.js";
import { BlockNoteOperation } from "../../functions/blocknoteFunctions.js";

export type ApplyOperationResult = {
  operation: BlockNoteOperation<PartialBlock<any, any, any>>;
  result: "ok";
  lastBlockId: string;
};

/**
 * Applies the operations to the editor and yields the results.
 */
export async function* applyOperations(
  editor: BlockNoteEditor<any, any, any>,
  operationsStream: AsyncIterable<{
    operation: BlockNoteOperation<PartialBlock<any, any, any>>;
    isUpdateToPreviousOperation: boolean;
    isPossiblyPartial: boolean;
  }>,
  options: {
    withDelays: boolean;
  } = {
    withDelays: true,
  }
): AsyncGenerator<ApplyOperationResult> {
  let minSize = 50;

  for await (const chunk of operationsStream) {
    // TODO: add vs insert
    if (chunk.operation.type === "add") {
      // TODO: apply as agent?
      const ret = editor.insertBlocks(
        chunk.operation.blocks,
        chunk.operation.referenceId,
        chunk.operation.position
      );
      yield {
        operation: chunk.operation,
        result: "ok",
        lastBlockId: ret[ret.length - 1].id,
      };
    } else if (chunk.operation.type === "update") {
      if (chunk.isPossiblyPartial) {
        // TODO: unit test and / or extract to separate pipeline step
        const size = JSON.stringify(chunk.operation.block).length;
        if (size < minSize) {
          continue;
        } else {
          // console.log("increasing minSize", minSize);
          // increase minSize for next chunk
          minSize = size + 50;
        }
      } else {
        // reset for next chunk
        minSize = 50;
      }

      console.log("update", JSON.stringify(chunk.operation, null, 2));
      // Convert the update operation directly to ReplaceSteps
      const steps = updateToReplaceSteps(
        editor,
        chunk.operation,
        chunk.isPossiblyPartial
      );

      // Apply the steps as an agent with human-like typing behavior
      await applyStepsAsAgent(editor, steps, async (tr, type) => {
        // Add a small delay to simulate human typing
        if (options.withDelays) {
          if (type === "select") {
            await new Promise((resolve) => setTimeout(resolve, 100));
          } else if (type === "insert") {
            await new Promise((resolve) => setTimeout(resolve, 10));
          } else if (type === "replace") {
            await new Promise((resolve) => setTimeout(resolve, 200));
          } else {
            throw new UnreachableCaseError(type);
          }
        }

        editor.dispatch(tr);
      });

      yield {
        operation: chunk.operation,
        result: "ok",
        lastBlockId: chunk.operation.id,
      };
    } else if (chunk.operation.type === "delete") {
      // TODO: apply as agent?
      const prevBlock = editor.getPrevBlock(chunk.operation.ids[0]);
      editor.removeBlocks(chunk.operation.ids);
      yield {
        operation: chunk.operation,
        result: "ok",
        lastBlockId: prevBlock?.id ?? editor.document[0].id,
      };
    } else {
      throw new UnreachableCaseError(chunk.operation);
    }
  }
  // TODO: remove?
  applySuggestions(editor.prosemirrorState, (tr) => {
    editor.dispatch(tr);
  });
}
/*

// insert
- insert block
- per stream update:
  - update block (char by char)

// delete
- select text
- delete text

// update:
- calculate diffs (changeset)
- per diff:
  - select text
  - replace text
  - insert text


*/
