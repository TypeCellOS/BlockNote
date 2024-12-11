import { BlockNoteEditor } from "@blocknote/core";
import { validateBlockFunction } from "./validate.js";

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
        $ref: "#/$defs/block",
        // type: "object",
        // properties: {},
      },
      type: "array",
    },
  },
  required: ["referenceId", "position", "blocks"],
} as const;

// TODO: document
function applyOperation(
  operation: any,
  editor: BlockNoteEditor,
  operationContext: any,
  options: {
    idsSuffixed: boolean;
  }
) {
  let referenceId = operation.referenceId;
  if (options.idsSuffixed) {
    referenceId = referenceId.slice(0, -1);
  }

  const idsAdded = operationContext || [];
  const toUpdate = operation.blocks.slice(0, idsAdded.length);

  for (let i = 0; i < toUpdate.length; i++) {
    editor.updateBlock(idsAdded[i], toUpdate[i]);
  }

  const toAdd = operation.blocks.slice(idsAdded.length);
  if (toAdd.length > 0) {
    if (toUpdate.length === 0) {
      const ret = editor.insertBlocks(toAdd, referenceId, operation.position);
      return [...ret.map((block) => block.id)];
    }

    // insert after the last inserted block part of this operation
    const ret = editor.insertBlocks(
      toAdd,
      idsAdded[idsAdded.length - 1],
      "after"
    );
    return [...idsAdded, ...ret.map((block) => block.id)];
  }
  return idsAdded;
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

  if (operation.position !== "before" && operation.position !== "after") {
    return false;
  }

  let referenceId = operation.referenceId;
  if (options.idsSuffixed) {
    if (!referenceId?.endsWith("$")) {
      return false;
    }

    referenceId = referenceId.slice(0, -1);
  }

  const block = editor.getBlock(referenceId);

  if (!block) {
    return false;
  }

  if (!operation.blocks || operation.blocks.length === 0) {
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
