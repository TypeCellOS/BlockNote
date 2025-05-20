import { BlockNoteEditor, PartialBlock, trackPosition } from "@blocknote/core";
import type { JSONSchema7 } from "json-schema";
import { Transform } from "prosemirror-transform";
import {
  applyAgentStep,
  delayAgentStep,
  getStepsAsAgent,
} from "../../../prosemirror/agent.js";
import { updateToReplaceSteps } from "../../../prosemirror/changeset.js";
import { RebaseTool } from "../../../prosemirror/rebaseTool.js";
import {
  Result,
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
  /**
   * The description of the tool
   */
  description: string;
  /**
   * The schema of the tool
   */
  schema:
    | {
        block: JSONSchema7;
        $defs?: JSONSchema7["$defs"];
      }
    | ((editor: BlockNoteEditor<any, any, any>) => {
        block: JSONSchema7;
        $defs?: JSONSchema7["$defs"];
      });
  /**
   * A function that can validate a block
   */
  validateBlock: (
    block: any,
    editor: BlockNoteEditor<any, any, any>,
    fallbackType?: string,
  ) => Result<T>;
  /**
   * The rebaseTool is used to get a projection of the document that
   * the JSON Tool Calls will be applied to. By using the rebaseTool we can
   * apply operations to a "projected" document, and then map them (rebase) to the actual document
   *
   * This is to:
   * - apply operations without suggestion-marks to an editor that has suggestions in it
   *  (the projection should have the suggestions applied)
   * - apply operations from a format that doesn't support all Block features (e.g.: markdown)
   *   (the projection should be the the BlockNote document without the unsupported features)
   */
  rebaseTool: (
    id: string,
    editor: BlockNoteEditor<any, any, any>,
  ) => Promise<RebaseTool>;
  /**
   * Converts the operation from `AddBlocksToolCall<T>` to `AddBlocksToolCall<PartialBlock<any, any, any>>`
   *
   * When using these factories to create a tool for a different format (e.g.: HTML / MD),
   * the `toJSONToolCall` function is used to convert the operation to a format that we can execute
   */
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
      onBlockUpdate?: (blockId: string) => void;
    },
  ) => {
    const schema =
      typeof config.schema === "function"
        ? config.schema(editor)
        : config.schema;
    return streamTool<UpdateBlockToolCall<T>>({
      name: "update",
      description: config.description,
      parameters: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "id of block to update",
          },
          block: schema.block,
        },
        required: ["id", "block"],
        $defs: schema.$defs,
      },
      validate: (operation) => {
        if (operation.type !== "update") {
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

        if (!operation.block) {
          return {
            ok: false,
            error: "block is required",
          };
        }

        const block = editor.getBlock(id);

        if (!block) {
          // eslint-disable-next-line no-console
          console.error("BLOCK NOT FOUND", id);
          return {
            ok: false,
            error: "block not found",
          };
        }

        const ret = config.validateBlock(operation.block, editor, block.type);

        if (!ret.ok) {
          return ret;
        }

        return {
          ok: true,
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
            const size = JSON.stringify(operation.block).length;
            if (size < minSize) {
              continue;
            } else {
              // increase minSize for next chunk
              minSize = size + STEP_SIZE;
            }
          } else {
            // reset for next chunk
            minSize = STEP_SIZE;
          }

          // REC: we could investigate whether we can use a single rebasetool across operations instead of
          // creating a new one every time (possibly expensive)
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

            // REC: unit test this and see if it's still needed even if we pass `dontReplaceContentAtEnd` to `updateToReplaceSteps`
            continue;
          }

          const inverted = steps.map((step) => step.map(tool.invertMap)!);

          const tr = new Transform(editor.prosemirrorState.doc);
          for (const step of inverted) {
            tr.step(step.map(tr.mapping)!);
          }
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
  };
}
