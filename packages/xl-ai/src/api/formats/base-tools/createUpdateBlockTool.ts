import { BlockNoteEditor, PartialBlock, trackPosition } from "@blocknote/core";
import type { JSONSchema7 } from "json-schema";
import {
  agentStepToTr,
  delayAgentStep,
  getStepsAsAgent,
} from "../../../prosemirror/agent.js";
import { updateToReplaceSteps } from "../../../prosemirror/changeset.js";
import { RebaseTool } from "../../../prosemirror/rebaseTool.js";
import {
  InvalidOrOk,
  StreamTool,
  streamTool,
  StreamToolCall,
} from "../../../streamTool/streamTool.js";

export type UpdateBlockToolCall<T> = {
  type: "update";
  id: string;
  block: T;
};

/**
 * Factory function to create a StreamTool that Updates blocks in the document.
 */
export function createUpdateBlockTool<T>(config: {
  description: string;
  schema: {
    block: JSONSchema7;
    $defs?: JSONSchema7["$defs"];
  };
  validateBlock: (
    block: any,
    editor: BlockNoteEditor<any, any, any>,
    fallbackType?: string,
  ) => InvalidOrOk<T>;
  rebaseTool: (
    id: string,
    editor: BlockNoteEditor<any, any, any>,
  ) => Promise<RebaseTool>;
  toJSONToolCall: (
    editor: BlockNoteEditor<any, any, any>,
    chunk: {
      operation: UpdateBlockToolCall<T>;
      isUpdateToPreviousOperation: boolean;
      isPossiblyPartial: boolean;
    },
  ) => Promise<UpdateBlockToolCall<PartialBlock<any, any, any>> | undefined>;
}) {
  return (
    editor: BlockNoteEditor<any, any, any>,
    options: {
      idsSuffixed: boolean;
      withDelays: boolean;
      updateSelection?: {
        from: number;
        to: number;
      };
    },
  ) =>
    streamTool<UpdateBlockToolCall<T>>({
      name: "update",
      description: config.description,
      parameters: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "id of block to update",
          },
          block: config.schema.block,
        },
        required: ["id", "block"],
        $defs: config.schema.$defs,
      },
      validate: (operation) => {
        if (operation.type !== "update") {
          return {
            result: "invalid",
            reason: "invalid operation type",
          };
        }

        if (!operation.id) {
          return {
            result: "invalid",
            reason: "id is required",
          };
        }

        let id = operation.id;
        if (options.idsSuffixed) {
          if (!id?.endsWith("$")) {
            return {
              result: "invalid",
              reason: "id must end with $",
            };
          }

          id = id.slice(0, -1);
        }

        if (!operation.block) {
          return {
            result: "invalid",
            reason: "block is required",
          };
        }

        const block = editor.getBlock(id);

        if (!block) {
          // eslint-disable-next-line no-console
          console.error("BLOCK NOT FOUND", id);
          return {
            result: "invalid",
            reason: "block not found",
          };
        }

        const ret = config.validateBlock(operation.block, editor, block.type);

        if (ret.result === "invalid") {
          return ret;
        }

        return {
          result: "ok",
          value: {
            type: operation.type,
            id,
            block: ret.value,
          },
        };
      },
      // Note: functionality mostly tested in jsontools.test.ts
      // would be nicer to add a direct unit test
      execute: async function* (
        operationsStream: AsyncIterable<{
          operation: StreamToolCall<StreamTool<any>[]>;
          isUpdateToPreviousOperation: boolean;
          isPossiblyPartial: boolean;
        }>,
      ) {
        const STEP_SIZE = 50;
        let minSize = STEP_SIZE;
        const selectionPositions = options.updateSelection
          ? {
              from: trackPosition(editor, options.updateSelection.from),
              to: trackPosition(editor, options.updateSelection.to),
            }
          : undefined;

        for await (const chunk of operationsStream) {
          if (chunk.operation.type !== "update") {
            // pass through non-update operations
            yield chunk;
            continue;
          }

          const operation = chunk.operation as UpdateBlockToolCall<T>;

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
          const tool = await config.rebaseTool(operation.id, editor);

          const fromPos = selectionPositions
            ? tool.invertMap.invert().map(selectionPositions.from())
            : undefined;

          const toPos = selectionPositions
            ? tool.invertMap.invert().map(selectionPositions.to())
            : undefined;

          const jsonToolCall = await config.toJSONToolCall(editor, chunk);
          if (!jsonToolCall) {
            continue;
          }

          const steps = updateToReplaceSteps(
            jsonToolCall,
            tool.doc,
            chunk.isPossiblyPartial,
            fromPos,
            toPos,
          );

          if (steps.length === 1 && chunk.isPossiblyPartial) {
            // when replacing a larger piece of text (try translating a 3 paragraph document), we want to do this as one single operation
            // we don't want to do this "sentence-by-sentence"

            // if there's only a single replace step to be done and we're partial, let's wait for more content

            // TODO: unit test this and see if it's still needed even if we pass `dontReplaceContentAtEnd` to `updateToReplaceSteps`
            continue;
          }

          const inverted = steps.map((step) => step.map(tool.invertMap)!);

          const agentSteps = getStepsAsAgent(
            editor.prosemirrorState.doc,
            editor.pmSchema,
            inverted,
          );

          for (const step of agentSteps) {
            if (options.withDelays) {
              await delayAgentStep(step);
            }
            editor.transact((tr) => {
              agentStepToTr(tr, step);
            });
          }
        }
      },
    });
}
