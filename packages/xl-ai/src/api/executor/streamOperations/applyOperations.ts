import { BlockNoteEditor, UnreachableCaseError } from "@blocknote/core";
import { applySuggestions } from "@handlewithcare/prosemirror-suggest-changes";
import { ChangeSet } from "prosemirror-changeset";
import { applyStepsAsAgent } from "../../../prosemirror/agent.js";
import { updateToReplaceSteps } from "../../../prosemirror/changeset.js";
import { BlockNoteOperation } from "../../functions/blocknoteFunctions.js";

/**
 * Applies the operations to the editor and yields the results.
 */
export async function* applyOperations(
  editor: BlockNoteEditor<any, any, any>,
  operationsStream: AsyncIterable<{
    operation: BlockNoteOperation;
  }>,
  options: {
    withDelays: boolean;
  } = {
    withDelays: true,
  }
): AsyncGenerator<{
  operation: BlockNoteOperation;
  result: "ok";
  lastBlockId: string;
  changeset?: ChangeSet;
}> {
  for await (const chunk of operationsStream) {
    if (chunk.operation.type === "insert") {
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
      // Convert the update operation directly to ReplaceSteps
      const steps = updateToReplaceSteps(editor, chunk.operation);

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

      // TODO: remove?
      applySuggestions(editor.prosemirrorState, (tr) => {
        editor.dispatch(tr);
      });

      yield {
        operation: chunk.operation,
        result: "ok",
        lastBlockId: chunk.operation.id,
      };
    } else if (chunk.operation.type === "remove") {
      // TODO: apply as agent?
      const prevBlock = editor.getPrevBlock(chunk.operation.ids[0]);
      editor.removeBlocks(chunk.operation.ids);
      yield {
        operation: chunk.operation,
        result: "ok",
        lastBlockId: prevBlock?.id ?? editor.document[0].id,
      };
    }
  }
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
