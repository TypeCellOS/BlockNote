import { BlockNoteEditor, removeAndInsertBlocks } from "@blocknote/core";
import {
  agentStepToTr,
  delayAgentStep,
  getStepsAsAgent,
} from "../../prosemirror/agent.js";
import { streamTool } from "../streamTool/streamTool.js";

// TODO, rename to remove?
export const deleteBlockTool = (
  editor: BlockNoteEditor<any, any, any>,
  options: { idsSuffixed: boolean; withDelays: boolean },
) =>
  streamTool<DeleteBlockToolCall>({
    name: "delete",
    description: "Delete a block",
    parameters: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "id of block to delete",
        },
      },
      required: ["id"],
    },
    validate: (operation) => {
      if (operation.type !== "delete") {
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

      const block = editor.getBlock(id);

      if (!block) {
        return {
          result: "invalid",
          reason: "block not found",
        };
      }

      return {
        result: "ok",
        value: {
          type: "delete", // TODO
          id,
        },
      };
    },
    execute: async function* (operationsStream) {
      for await (const chunk of operationsStream) {
        if (chunk.operation.type !== "delete") {
          // ignore non-update operations
          yield chunk;
          continue;
        }

        const operation = chunk.operation as DeleteBlockToolCall;

        const tr = editor.prosemirrorState.tr;

        removeAndInsertBlocks(tr, [operation.id], []);

        const agentSteps = getStepsAsAgent(
          editor.prosemirrorState.doc,
          editor.pmSchema,
          tr.steps,
        );

        // TODO: invert?
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
          //   lastBlockId: operation.id,
          // };
        }
      }
    },
  });

export type DeleteBlockToolCall = {
  type: "delete";
  id: string;
};
