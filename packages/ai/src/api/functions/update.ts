import { BlockNoteEditor } from "@blocknote/core";
import { validateBlockFunction } from "./validate";

const schema = {
  name: "update",
  description: "Update a block",
  parameters: {
    id: {
      type: "string",
      description: "id of block to update",
    },
    block: {
      // $ref: "#/definitions/newblock",
      type: "object",
      properties: {},
    },
  },
  required: ["id", "block"],
};

function applyOperation(operation: any, editor: BlockNoteEditor) {
  const id = operation.id.slice(0, -1);
  editor.updateBlock(id, operation.block);
}

function validateOperation(operation: any, editor: BlockNoteEditor) {
  if (operation.type !== schema.name) {
    return false;
  }

  if (!operation.id?.endsWith("$")) {
    return false;
  }

  const id = operation.id.slice(0, -1);
  const block = editor.getBlock(id);

  if (!block) {
    return false;
  }

  const type = operation.block.type || block.type;

  return validateBlockFunction(operation.block, editor, type);
}

export const updateFunction = {
  schema,
  apply: applyOperation,
  validate: validateOperation,
};
