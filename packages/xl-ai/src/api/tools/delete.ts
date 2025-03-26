import { streamTool } from "../streamTool/streamTool.js";

// TODO, rename to remove?
export const deleteBlockTool = streamTool<DeleteBlockToolCall>(
  "delete",
  "Delete a block",
  {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "id of block to delete",
      },
    },
    required: ["id"],
  },
  (
    operation,
    editor,
    options: {
      idsSuffixed: boolean;
    }
  ) => {
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
  }
);

export type DeleteBlockToolCall = {
  type: "delete";
  id: string;
};
