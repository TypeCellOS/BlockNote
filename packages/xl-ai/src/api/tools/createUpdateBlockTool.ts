import { BlockNoteEditor } from "@blocknote/core";
import { JSONSchema7Definition } from "json-schema";
import { InvalidOrOk, streamTool } from "../streamTool/streamTool.js";

export type UpdateBlockToolCall<T> = {
  type: "update";
  id: string;
  block: T;
};

export function createUpdateBlockTool<T>(
  description: string,
  blockSchema: JSONSchema7Definition,
  validateBlock: (
    block: any,
    editor: BlockNoteEditor<any, any, any>,
    fallbackType?: string
  ) => InvalidOrOk<T>
) {
  return streamTool<UpdateBlockToolCall<T>>(
    "update",
    description,
    {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "id of block to update",
        },
        block: blockSchema,
      },
      required: ["id", "block"],
    },
    (operation, editor, options) => {
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

      const ret = validateBlock(operation.block, editor, block.type);

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
    }
  );
}
