import { BlockNoteEditor } from "@blocknote/core";
import { InvalidOrOk, RemoveBlocksOperation } from "./blocknoteFunctions.js";

const schema = {
  name: "delete",
  description: "Delete a block",
  parameters: {
    id: {
      type: "string",
      description: "id of block to delete",
    },
  },
  required: ["id"],
};

function toBlockNoteOperation(
  operation: any,
  editor: BlockNoteEditor,
  options: {
    idsSuffixed: boolean;
  }
): InvalidOrOk<RemoveBlocksOperation> {
  if (operation.type !== schema.name) {
    return {
      result: "invalid",
      reason: "invalid operation type",
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
      type: "remove",
      ids: [id],
    },
  };
}

export const deleteFunction = {
  schema,
  toBlockNoteOperation,
};
