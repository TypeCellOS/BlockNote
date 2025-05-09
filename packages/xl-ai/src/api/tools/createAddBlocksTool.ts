import { BlockNoteEditor, insertBlocks, PartialBlock } from "@blocknote/core";
import { JSONSchema7 } from "json-schema";

import {
  AgentStep,
  agentStepToTr,
  delayAgentStep,
  getStepsAsAgent,
} from "../../prosemirror/agent.js";
import { updateToReplaceSteps } from "../../prosemirror/changeset.js";
import { RebaseTool } from "../../prosemirror/rebaseTool.js";
import { InvalidOrOk, streamTool } from "../streamTool/streamTool.js";
import { validateArray } from "./util/validateArray.js";

export function createAddBlocksTool<T>(config: {
  description: string;
  schema: {
    block: JSONSchema7["items"];
    $defs?: JSONSchema7["$defs"];
  };
  validateBlock: (
    block: any,
    editor: BlockNoteEditor<any, any, any>,
  ) => InvalidOrOk<T>;
  rebaseTool: (
    id: string,
    editor: BlockNoteEditor<any, any, any>,
  ) => Promise<RebaseTool>;
  toJSONToolCall: (
    editor: BlockNoteEditor<any, any, any>,
    chunk: {
      operation: AddBlocksToolCall<T>;
      isUpdateToPreviousOperation: boolean;
      isPossiblyPartial: boolean;
    },
  ) => Promise<AddBlocksToolCall<PartialBlock<any, any, any>> | undefined>;
}) {
  return (
    editor: BlockNoteEditor<any, any, any>,
    options: {
      idsSuffixed: boolean;
      withDelays: boolean;
    },
  ) =>
    streamTool<AddBlocksToolCall<T>>({
      name: "add",
      description: config.description,
      parameters: {
        type: "object",
        properties: {
          referenceId: {
            type: "string",
            description: "MUST be an id of a block in the document",
          },
          position: {
            type: "string",
            enum: ["before", "after"],
            description:
              "`after` to add blocks AFTER (below) the block with `referenceId`, `before` to add the block BEFORE (above)",
          },
          blocks: {
            items: config.schema.block,
            type: "array",
          },
        },
        required: ["referenceId", "position", "blocks"],
        $defs: config.schema.$defs,
      },
      validate: (operation) => {
        if (operation.type !== "add") {
          return {
            result: "invalid",
            reason: "invalid operation type",
          };
        }

        if (operation.position !== "before" && operation.position !== "after") {
          return {
            result: "invalid",
            reason: "invalid position",
          };
        }

        if (!operation.referenceId || !operation.blocks) {
          return {
            result: "invalid",
            reason: "referenceId and blocks are required",
          };
        }

        let referenceId = operation.referenceId;
        if (options.idsSuffixed) {
          if (!referenceId?.endsWith("$")) {
            return {
              result: "invalid",
              reason: "referenceId must end with $",
            };
          }

          referenceId = referenceId.slice(0, -1);
        }

        const block = editor.getBlock(referenceId);

        if (!block) {
          return {
            result: "invalid",
            reason: "referenceId not found",
          };
        }

        const validatedBlocksResult = validateArray<T>(
          operation.blocks,
          (block) => config.validateBlock(block, editor),
        );

        if (validatedBlocksResult.result === "invalid") {
          return validatedBlocksResult;
        }

        return {
          result: "ok",
          value: {
            type: operation.type,
            referenceId,
            position: operation.position,
            blocks: validatedBlocksResult.value,
          },
        };
      },
      execute: async function* (operationsStream) {
        let addedBlockIds: string[] = []; // TODO: hacky

        for await (const chunk of operationsStream) {
          if (!chunk.isUpdateToPreviousOperation) {
            addedBlockIds = [];
          }

          if (chunk.operation.type !== "add") {
            // ignore non-add operations
            yield chunk;
            continue;
          }

          const operation = chunk.operation as AddBlocksToolCall<T>;

          const jsonToolCall = await config.toJSONToolCall(editor, chunk);
          if (!jsonToolCall) {
            continue;
          }

          for (let i = 0; i < operation.blocks.length; i++) {
            const block = jsonToolCall.blocks[i];
            const doc = editor.prosemirrorState.doc;
            const tr = editor.prosemirrorState.tr;
            // TODO: unit test
            let agentSteps: AgentStep[] = [];
            if (i < addedBlockIds.length) {
              const tool = await config.rebaseTool(addedBlockIds[i], editor);
              const steps = updateToReplaceSteps(
                {
                  id: addedBlockIds[i],
                  block,
                  type: "update",
                },
                tool.doc,
                false,
              );

              const inverted = steps.map((step) => step.map(tool.invertMap)!);
              agentSteps = getStepsAsAgent(doc, editor.pmSchema, inverted);
            } else {
              const ret = insertBlocks(
                tr,
                [block],
                i > 0 ? addedBlockIds[i - 1] : operation.referenceId,
                i > 0 ? "after" : operation.position,
              );
              addedBlockIds.push(...ret.map((r) => r.id));
              // TODO: inverted needed?
              agentSteps = getStepsAsAgent(doc, editor.pmSchema, tr.steps);
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
              if (options.withDelays) {
                await delayAgentStep(step);
              }
              editor.transact((tr) => {
                agentStepToTr(tr, step);
              });
              // yield {
              //   ...chunk,
              //   result: "ok",
              //   lastBlockId: addedBlockIds[i],
              // };
            }
          }
        }
      },
    });
}

export type AddBlocksToolCall<T> = {
  type: "add";
  referenceId: string;
  position: "before" | "after";
  blocks: T[];
};
