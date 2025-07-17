import { BlockNoteEditor, insertBlocks, PartialBlock } from "@blocknote/core";
import type { JSONSchema7 } from "json-schema";
import {
  AgentStep,
  applyAgentStep,
  delayAgentStep,
  getStepsAsAgent,
} from "../../../prosemirror/agent.js";
import { updateToReplaceSteps } from "../../../prosemirror/changeset.js";
import { RebaseTool } from "../../../prosemirror/rebaseTool.js";
import { Result, streamTool } from "../../../streamTool/streamTool.js";
import { isEmptyParagraph } from "../../../util/emptyBlock.js";
import { validateBlockArray } from "./util/validateBlockArray.js";

/**
 * Factory function to create a StreamTool that adds blocks to the document.
 */
export function createAddBlocksTool<T>(config: {
  /**
   * The description of the tool
   */
  description: string;
  /**
   * The schema of the tool
   */
  schema:
    | {
        block: JSONSchema7["items"];
        $defs?: JSONSchema7["$defs"];
      }
    | ((editor: BlockNoteEditor<any, any, any>) => {
        block: JSONSchema7["items"];
        $defs?: JSONSchema7["$defs"];
      });
  /**
   * A function that can validate a block
   */
  validateBlock: (
    block: any,
    editor: BlockNoteEditor<any, any, any>,
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
      onBlockUpdate?: (blockId: string) => void;
    },
  ) => {
    const schema =
      typeof config.schema === "function"
        ? config.schema(editor)
        : config.schema;
    return streamTool<AddBlocksToolCall<T>>({
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
            items: schema.block,
            type: "array",
          },
        },
        required: ["referenceId", "position", "blocks"],
        $defs: schema.$defs,
      },
      validate: (operation) => {
        if (operation.type !== "add") {
          return {
            ok: false,
            error: "invalid operation type",
          };
        }

        if (operation.position !== "before" && operation.position !== "after") {
          return {
            ok: false,
            error: "invalid position",
          };
        }

        if (!operation.referenceId || !operation.blocks) {
          return {
            ok: false,
            error: "referenceId and blocks are required",
          };
        }

        let referenceId = operation.referenceId;
        if (options.idsSuffixed) {
          if (!referenceId?.endsWith("$")) {
            return {
              ok: false,
              error: "referenceId must end with $",
            };
          }

          referenceId = referenceId.slice(0, -1);
        }

        const block = editor.getBlock(referenceId);

        if (!block) {
          return {
            ok: false,
            error: "referenceId not found",
          };
        }

        const validatedBlocksResult = validateBlockArray<T>(
          operation.blocks,
          (block) => config.validateBlock(block, editor),
        );

        if (!validatedBlocksResult.ok) {
          return validatedBlocksResult;
        }

        return {
          ok: true,
          value: {
            type: operation.type,
            referenceId,
            position: operation.position,
            blocks: validatedBlocksResult.value,
          },
        };
      },
      // Note: functionality mostly tested in jsontools.test.ts
      // would be nicer to add a direct unit test
      execute: async function* (operationsStream) {
        // An add operation has some complexity:
        // - it can add multiple blocks in 1 operation
        //   (this is needed because you need an id as reference block - and if you want to insert multiple blocks you can only use an existing block as reference id)
        // - when streaming, the first time we encounter a block to add, it's an "insert" operation, but after that (i.e.: more characters are being streamed in)
        //   it's an update operation (i.e.: update the previously added block)

        // keep track of added block ids to be able to update blocks that have already been added
        let addedBlockIds: string[] = [];

        const referenceIdMap: Record<string, string> = {}; // TODO: unit test

        for await (const chunk of operationsStream) {
          if (!chunk.isUpdateToPreviousOperation) {
            // we have a new operation, reset the added block ids
            addedBlockIds = [];
          }

          if (chunk.operation.type !== "add") {
            // pass through non-add operations
            yield chunk;
            continue;
          }

          const operation = chunk.operation as AddBlocksToolCall<T>;

          const jsonToolCall = await config.toJSONToolCall(editor, {
            ...chunk,
            operation,
          });

          if (!jsonToolCall) {
            continue;
          }

          if (
            chunk.isPossiblyPartial &&
            isEmptyParagraph(
              jsonToolCall.blocks[jsonToolCall.blocks.length - 1],
            )
          ) {
            // for example, a parsing just "<ul>" would first result in an empty paragraph,
            // wait for more content before adding the block
            continue;
          }

          for (let i = 0; i < jsonToolCall.blocks.length; i++) {
            const block = jsonToolCall.blocks[i];
            const tr = editor.prosemirrorState.tr;

            let agentSteps: AgentStep[] = [];
            if (i < addedBlockIds.length) {
              // we have already added this block, so we need to update it
              const tool = await config.rebaseTool(addedBlockIds[i], editor);
              const steps = updateToReplaceSteps(
                {
                  id: addedBlockIds[i],
                  block,
                },
                tool.doc,
                false,
              );

              const inverted = steps.map((step) => step.map(tool.invertMap)!);

              for (const step of inverted) {
                tr.step(step.map(tr.mapping)!);
              }
              agentSteps = getStepsAsAgent(tr);
              // don't spend time "selecting" the block as an agent, as we're continuing a previous update
              agentSteps = agentSteps.filter((step) => step.type !== "select");
            } else {
              // we are adding a new block, so we need to insert it
              const mappedReferenceId =
                operation.position === "after"
                  ? referenceIdMap[operation.referenceId]
                  : undefined;

              const ret = insertBlocks(
                tr,
                [block],
                i > 0
                  ? addedBlockIds[i - 1]
                  : mappedReferenceId || operation.referenceId,
                i > 0 ? "after" : operation.position,
              );
              addedBlockIds.push(...ret.map((r) => r.id));
              agentSteps = getStepsAsAgent(tr);
            }

            if (agentSteps.find((step) => step.type === "replace")) {
              // throw new Error("unexpected: replace step in add operation");
              // this is unexpected but we've been able to see this when:
              // adding a list item, because <ul> first gets parsed as paragraph, that then gets turned into a list
            }

            for (const step of agentSteps) {
              if (options.withDelays) {
                await delayAgentStep(step);
              }
              editor.transact((tr) => {
                applyAgentStep(tr, step);
              });
              options.onBlockUpdate?.(addedBlockIds[i]);
            }
          }

          if (!chunk.isPossiblyPartial) {
            if (operation.position === "after") {
              referenceIdMap[operation.referenceId] =
                addedBlockIds[addedBlockIds.length - 1];
            }
          }
        }
      },
    });
  };
}

export type AddBlocksToolCall<T> = {
  type: "add";
  referenceId: string;
  position: "before" | "after";
  blocks: T[];
};
