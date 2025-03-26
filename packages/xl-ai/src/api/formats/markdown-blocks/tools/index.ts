import { createAddBlocksTool } from "../../../tools/createAddBlocksTool.js";
import { createUpdateBlockTool } from "../../../tools/createUpdateBlockTool.js";
import { deleteBlockTool } from "../../../tools/delete.js";
import { validateBlockFunction } from "./validate.js";

export const tools = {
  add: createAddBlocksTool<string>(
    "Insert new blocks",
    {
      $ref: "#/$defs/block",
    },
    validateBlockFunction
  ),
  update: createUpdateBlockTool<string>(
    "Update a block, the new block will replace the existing block.",
    {
      $ref: "#/$defs/block",
    },
    validateBlockFunction
  ),
  delete: deleteBlockTool,
};
