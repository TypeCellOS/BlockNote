import { BlockNoteEditor, removeAndInsertBlocks } from "@blocknote/core";
import {
  applyAgentStep,
  delayAgentStep,
  getStepsAsAgent,
} from "../../../prosemirror/agent.js";
import { streamTool } from "../../../streamTool/streamTool.js";

/**
 * Factory function to create a StreamTool that deletes a block from the document.
 */
export const deleteBlockTool = (
  editor: BlockNoteEditor<any, any, any>,
  options: {
    idsSuffixed: boolean;
    withDelays: boolean;
    onBlockUpdate?: (blockId: string) => void;
  },
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
          ok: false,
          error: "invalid operation type",
        };
      }

      if (!operation.id) {
        return {
          ok: false,
          error: "id is required",
        };
      }

      let id = operation.id;
      if (options.idsSuffixed) {
        if (!id?.endsWith("$")) {
          return {
            ok: false,
            error: "id must end with $",
          };
        }

        id = id.slice(0, -1);
      }

      const block = editor.getBlock(id);

      if (!block) {
        return {
          ok: false,
          error: "block not found",
        };
      }

      return {
        ok: true,
        value: {
          type: "delete",
          id,
        },
      };
    },
    // Note: functionality mostly tested in jsontools.test.ts
    // would be nicer to add a direct unit test
    execute: async function* (operationsStream) {
      for await (const chunk of operationsStream) {
        if (chunk.operation.type !== "delete") {
          // pass through non-delete operations
          yield chunk;
          continue;
        }

        const operation = chunk.operation as DeleteBlockToolCall;

        const tr = editor.prosemirrorState.tr;

        removeAndInsertBlocks(tr, [operation.id], []);

        const agentSteps = getStepsAsAgent(tr);

        for (const step of agentSteps) {
          if (options.withDelays) {
            await delayAgentStep(step);
          }
          editor.transact((tr) => {
            applyAgentStep(tr, step);
          });
          options.onBlockUpdate?.(operation.id);
        }
      }
    },
  });

export type DeleteBlockToolCall = {
  type: "delete";
  id: string;
};
