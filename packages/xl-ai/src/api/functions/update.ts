import { BlockNoteEditor } from "@blocknote/core";
import { validateBlockFunction } from "./validate.js";

const schema = {
  name: "update",
  description: "Update a block",
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

function applyOperation(
  operation: any,
  editor: BlockNoteEditor,
  _operationContext: any,
  options: {
    idsSuffixed: boolean;
  }
  // operationContext: any
) {
  let id = operation.id;
  if (options.idsSuffixed) {
    id = id.slice(0, -1);
  }

  editor.updateBlock(id, operation.block);
}

function validateOperation(
  operation: any,
  editor: BlockNoteEditor,
  options: {
    idsSuffixed: boolean;
  }
) {
  if (operation.type !== schema.name) {
    return false;
  }

  let id = operation.id;
  if (options.idsSuffixed) {
    if (!id?.endsWith("$")) {
      return false;
    }

    id = id.slice(0, -1);
  }

  if (!operation.block) {
    return false;
  }

  const block = editor.getBlock(id);

  if (!block) {
    // eslint-disable-next-line no-console
    console.error("BLOCK NOT FOUND", id);
    return false;
  }

  return validateBlockFunction(operation.block, editor, block.type);
}

export const updateFunction = {
  schema,
  apply: applyOperation,
  validate: validateOperation,
};
