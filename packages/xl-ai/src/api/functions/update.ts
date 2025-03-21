import { BlockNoteEditor } from "@blocknote/core";
import { InvalidOrOk, UpdateBlocksOperation } from "./blocknoteFunctions.js";
import { validateBlockFunction } from "./validate.js";

const schema = {
  name: "update",
  description: "Update a block, the new block will replace the existing block.",
  parameters: {
    id: {
      type: "string",
      description: "id of block to update",
    },
    block: {
      $ref: "#/$defs/block",
      // type: "object",
      // properties: {},
    },
  },
  required: ["id", "block"],
};

function toBlockNoteOperation(
  operation: any,
  editor: BlockNoteEditor,
  options: {
    idsSuffixed: boolean;
  }
): InvalidOrOk<UpdateBlocksOperation> {
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

  const ret = validateBlockFunction(operation.block, editor, block.type);

  if (ret.result === "invalid") {
    return ret;
  }

  return {
    result: "ok",
    value: {
      type: "update",
      block: operation.block,
      id,
    },
  };
}

export const updateFunction = {
  schema,
  toBlockNoteOperation,
};
