import { BlockNoteEditor } from "@blocknote/core";
import { JSONSchema7 } from "json-schema";

import { InvalidOrOk, streamTool } from "../streamTool/streamTool.js";
import { validateArray } from "./util/validateArray.js";

// TODO
// {
//   $ref: "#/$defs/block",
//   // type: "object",
//   // properties: {},
// },

export function createAddBlocksTool<T>(
  description: string,
  schema: {
    block: JSONSchema7["items"],
    $defs?: JSONSchema7["$defs"],
  },
  validateBlock: (
    block: any,
    editor: BlockNoteEditor<any, any, any>
  ) => InvalidOrOk<T>
) {
  return (editor: BlockNoteEditor<any, any, any>, options: { idsSuffixed: boolean }) => streamTool<AddBlocksToolCall<T>>(
    "add",
    description,
    {
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
    (operation) => {
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
        (block) => validateBlock(block, editor)
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
    }
  );
}

export type AddBlocksToolCall<T> = {
  type: "add";
  referenceId: string;
  position: "before" | "after";
  blocks: T[];
};
