import { BlockNoteEditor } from "@blocknote/core";
import { validateBlockFunction } from "./validate";

const schema = {
  name: "add",
  description: "Insert new blocks",
  parameters: {
    referenceId: {
      type: "string",
      description: "",
    },
    position: {
      type: "string",
      enum: ["before", "after"],
      description:
        "Whether new block(s) should be inserterd before or after `referenceId`",
    },
    blocks: {
      items: {
        // $ref: "#/definitions/newblock",
        type: "object",
        properties: {},
      },
      type: "array",
    },
  },
  required: ["referenceId", "position", "blocks"],
} as const;

function applyOperation(operation: any, editor: BlockNoteEditor) {
  const id = operation.referenceId.slice(0, -1);
  editor.insertBlocks(operation.blocks, id, operation.position);
}

function validateOperation(operation: any, editor: BlockNoteEditor) {
  if (operation.type !== schema.name) {
    return false;
  }

  if (operation.position !== "before" && operation.position !== "after") {
    return false;
  }

  if (!operation.referenceId?.endsWith("$")) {
    return false;
  }

  const id = operation.referenceId.slice(0, -1);
  const block = editor.getBlock(id);

  if (!block) {
    return false;
  }

  return (operation.blocks as []).every((block: any) =>
    validateBlockFunction(block, editor)
  );
}

export const addFunction = {
  schema,
  apply: applyOperation,
  validate: validateOperation,
};
