import { BlockNoteEditor } from "@blocknote/core";

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

function applyOperation(
  operation: any,
  editor: BlockNoteEditor,
  operationContext: any
) {
  const id: string = operation.id.slice(0, -1);
  editor.removeBlocks([id]);
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

  return true;
}

export const deleteFunction = {
  schema,
  apply: applyOperation,
  validate: validateOperation,
};
