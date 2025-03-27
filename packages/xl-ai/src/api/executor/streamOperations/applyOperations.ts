import {
  BlockNoteEditor,
  PartialBlock,
  UnreachableCaseError,
} from "@blocknote/core";
import { applySuggestions } from "@handlewithcare/prosemirror-suggest-changes";
import { applyStepsAsAgent } from "../../../prosemirror/agent.js";
import { updateToReplaceSteps } from "../../../prosemirror/changeset.js";
import { RebaseTool } from "../../../prosemirror/rebaseTool.js";
import { StreamTool, StreamToolCall } from "../../streamTool/streamTool.js";
import { AddBlocksToolCall } from "../../tools/createAddBlocksTool.js";
import { UpdateBlockToolCall } from "../../tools/createUpdateBlockTool.js";
import { DeleteBlockToolCall } from "../../tools/delete.js";

export type ApplyOperationResult<T extends StreamTool<any>[]> =
  | {
      operation: StreamToolCall<T>;
      isUpdateToPreviousOperation: boolean;
      isPossiblyPartial: boolean;
      result: "ok";
      lastBlockId: string;
    }
  | {
      operation: StreamToolCall<T>;
      isUpdateToPreviousOperation: boolean;
      isPossiblyPartial: boolean;
    };

function isBuiltInToolCall(
  operation: unknown
): operation is
  | UpdateBlockToolCall<PartialBlock<any, any, any>>
  | AddBlocksToolCall<PartialBlock<any, any, any>>
  | DeleteBlockToolCall {
  return (
    typeof operation === "object" &&
    operation !== null &&
    "type" in operation &&
    (operation.type === "update" ||
      operation.type === "add" ||
      operation.type === "delete")
  );
}

/**
 * Applies the operations to the editor and yields the results.
 */
export async function* applyOperations<T extends StreamTool<any>[]>(
  editor: BlockNoteEditor<any, any, any>,
  operationsStream: AsyncIterable<{
    operation: StreamToolCall<T>;
    isUpdateToPreviousOperation: boolean;
    isPossiblyPartial: boolean;
  }>,
  rebaseTool: (blockId: string) => Promise<RebaseTool>,
  options: {
    withDelays: boolean;
  } = {
    withDelays: true,
  }
): AsyncGenerator<ApplyOperationResult<any>> {
  let minSize = 50;

  for await (const chunk of operationsStream) {
    const operation = chunk.operation as unknown;
    if (!isBuiltInToolCall(operation)) {
      yield chunk;
      continue;
    }

    // TODO: add vs insert
    if (operation.type === "add") {
      // TODO: apply as agent?
      const ret = editor.insertBlocks(
        operation.blocks,
        operation.referenceId,
        operation.position
      );
      yield {
        ...chunk,
        result: "ok",
        lastBlockId: ret[ret.length - 1].id,
      };
    } else if (operation.type === "update") {
      if (chunk.isPossiblyPartial) {
        // TODO: unit test and / or extract to separate pipeline step
        const size = JSON.stringify(operation.block).length;
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

      // TODO: this might be inefficient, we might be able to pass a single rebaseTool as long as we map subsequent operations
      const tool = await rebaseTool(operation.id);
      console.log("update", JSON.stringify(chunk.operation, null, 2));
      // Convert the update operation directly to ReplaceSteps
      const steps = updateToReplaceSteps(
        editor,
        operation,
        tool.doc,
        chunk.isPossiblyPartial
      );

      const inverted = steps.map((step) => step.map(tool.invertMap)!);

      // Apply the steps as an agent with human-like typing behavior
      await applyStepsAsAgent(editor, inverted, async (tr, type) => {
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
        ...chunk,
        result: "ok",
        lastBlockId: chunk.operation.id,
      };
    } else if (operation.type === "delete") {
      // TODO: apply as agent?
      const prevBlock = editor.getPrevBlock(operation.id);
      editor.removeBlocks([operation.id]);
      yield {
        ...chunk,
        result: "ok",
        lastBlockId: prevBlock?.id ?? editor.document[0].id,
      };
    } else {
      throw new UnreachableCaseError(operation.type);
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
