import {
  BlockNoteEditor,
  PartialBlock,
  UnreachableCaseError,
  insertBlocksTr,
  removeAndInsertBlocksTr,
} from "@blocknote/core";
import { Mapping } from "prosemirror-transform";
import { AgentStep, getStepsAsAgent } from "../../../prosemirror/agent.js";
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
      result: "not-executed";
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
  },
  // TODO: map through mapper
  updateFromPos?: number,
  updateToPos?: number
): AsyncGenerator<ApplyOperationResult<any>> {
  const STEP_SIZE = 50;
  let minSize = STEP_SIZE;
  const mapping = new Mapping();

  let addedBlockIds: string[] = []; // TODO: hacky

  for await (const chunk of operationsStream) {
    if (!chunk.isUpdateToPreviousOperation) {
      addedBlockIds = [];
    }

    const operation = chunk.operation as unknown;
    if (!isBuiltInToolCall(operation)) {
      yield {
        ...chunk,
        result: "not-executed",
      };
      continue;
    }

    // TODO: add vs insert
    if (operation.type === "add") {
      for (let i = 0; i < operation.blocks.length; i++) {
        const block = operation.blocks[i];
        const tr = editor.prosemirrorState.tr;
        // TODO: unit test
        let agentSteps: AgentStep[] = [];
        if (i < addedBlockIds.length) {
          const tool = await rebaseTool(addedBlockIds[i]);
          const steps = updateToReplaceSteps(
            editor,
            {
              id: addedBlockIds[i],
              block: operation.blocks[i],
              type: "update",
            },
            tool.doc,
            false
          );

          const inverted = steps.map((step) => step.map(tool.invertMap)!);
          agentSteps = getStepsAsAgent(editor, inverted);
        } else {
          const ret = insertBlocksTr(
            editor,
            tr,
            [block],
            i > 0 ? addedBlockIds[i - 1] : operation.referenceId,
            i > 0 ? "after" : operation.position
          );
          addedBlockIds.push(...ret.map((r) => r.id));
          agentSteps = getStepsAsAgent(editor, tr.steps);
        }
        agentSteps = agentSteps
          .filter((step) => step.type !== "select")
          .map((step) => {
            // this is a bit hacky, but we don't consider steps from inserts to be replaces
            // technically, we are replacing the inserted block all the time instead of just appending content
            // but we should just treat these as inserts by the agent, not replaces (replaces are "faked" to be slower)
            step.type = "insert";
            return step;
          });
        for (const step of agentSteps) {
          const tr = await agentStepToTr(editor, step, options);
          // stepMapping.appendMapping(tr.mapping);
          mapping.appendMapping(tr.mapping);
          // console.log("applying tr", block, tr.steps);
          editor.dispatch(tr);
          yield {
            ...chunk,
            result: "ok",
            lastBlockId: addedBlockIds[i],
          };
        }
      }
    } else if (operation.type === "update") {
      if (chunk.isPossiblyPartial) {
        // TODO: unit test and / or extract to separate pipeline step
        const size = JSON.stringify(operation.block).length;
        if (size < minSize) {
          continue;
        } else {
          // console.log("increasing minSize", minSize);
          // increase minSize for next chunk
          minSize = size + STEP_SIZE;
        }
      } else {
        // reset for next chunk
        minSize = STEP_SIZE;
      }
      // console.log("apply", operation.block);

      // TODO: this might be inefficient, we might be able to pass a single rebaseTool as long as we map subsequent operations
      const tool = await rebaseTool(operation.id);
      // console.log("update", JSON.stringify(chunk.operation, null, 2));
      // Convert the update operation directly to ReplaceSteps
      const fromPos = updateFromPos
        ? tool.invertMap.invert().map(mapping.map(updateFromPos))
        : undefined;
      const toPos = updateToPos
        ? tool.invertMap.invert().map(mapping.map(updateToPos))
        : undefined;

      const steps = updateToReplaceSteps(
        editor,
        operation,
        tool.doc,
        chunk.isPossiblyPartial,
        fromPos,
        toPos
      );

      if (steps.length === 1 && chunk.isPossiblyPartial) {
        // TODO: check if replace step only?
        // TODO: this doesn't consistently work, as there might be > 1 step when changeset wrongly sees a "space" as "keep"

        // when replacing a larger piece of text (try translating a 3 paragraph document), we want to do this as one single operation
        // we don't want to do this "sentence-by-sentence"

        // if there's only a single replace step to be done and we're partial, let's wait for more content
        continue;
      }

      const inverted = steps.map((step) => step.map(tool.invertMap)!);

      const agentSteps = getStepsAsAgent(editor, inverted);
      for (const step of agentSteps) {
        console.log("step", step);
        const tr = await agentStepToTr(editor, step, options);
        mapping.appendMapping(tr.mapping);
        editor.dispatch(tr);
        yield {
          ...chunk,
          result: "ok",
          lastBlockId: chunk.operation.id,
        };
      }
    } else if (operation.type === "delete") {
      // not needed as paragraph is kept but only marked as deleted
      // const prevBlock = editor.getPrevBlock(operation.id);
      // const lastBlockId = prevBlock?.id ?? editor.document[0].id;
      const tr = editor.prosemirrorState.tr;
      removeAndInsertBlocksTr(editor, tr, [operation.id], []);

      const agentSteps = getStepsAsAgent(editor, tr.steps);

      for (const step of agentSteps) {
        const tr = await agentStepToTr(editor, step, options);
        mapping.appendMapping(tr.mapping);
        editor.dispatch(tr);
        yield {
          ...chunk,
          result: "ok",
          lastBlockId: operation.id,
        };
      }
    } else {
      throw new UnreachableCaseError(operation.type);
    }
  }
  // TODO: remove?
  // applySuggestions(editor.prosemirrorState, (tr) => {
  //   editor.dispatch(tr);
  // });
}

async function agentStepToTr(
  editor: BlockNoteEditor<any, any, any>,
  step: AgentStep,
  options: { withDelays: boolean }
) {
  if (options.withDelays) {
    if (step.type === "select") {
      await new Promise((resolve) => setTimeout(resolve, 100));
    } else if (step.type === "insert") {
      await new Promise((resolve) => setTimeout(resolve, 10));
    } else if (step.type === "replace") {
      await new Promise((resolve) => setTimeout(resolve, 200));
    } else {
      throw new UnreachableCaseError(step.type);
    }
  }
  const tr = editor.prosemirrorState.tr.setMeta("addToHistory", false);

  if (step.selection) {
    tr.setMeta("aiAgent", {
      selection: {
        anchor: step.selection.anchor,
        head: step.selection.head,
      },
    });
  }
  for (const pmStep of step.prosemirrorSteps) {
    const result = tr.maybeStep(pmStep);
    if (result.failed) {
      // this would fail for tables, but has since been fixed using filterTransaction (in AIExtension)
      // we now throw an error here, but maybe safer as warning when shipping (TODO)

      throw new Error("failed to apply step");
      // console.warn("failed to apply step", pmStep);
    }
  }
  return tr;
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
