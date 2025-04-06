import { createAddBlocksTool } from "../../../tools/createAddBlocksTool.js";
import { createUpdateBlockTool } from "../../../tools/createUpdateBlockTool.js";
import { deleteBlockTool } from "../../../tools/delete.js";
import { validateBlockFunction } from "./validate.js";

export const tools = {
  add: createAddBlocksTool<string>(
    "Insert new blocks",
    {
      block: {
        $ref: "#/$defs/block",
      },
      $defs: {
        block: { type: "string", description: "markdown of block" },
      }
    },
    validateBlockFunction
  ),
  update: createUpdateBlockTool<string>(
    "Update a block, the new block will replace the existing block.",
    {
      block: {
        $ref: "#/$defs/block",
      },
      $defs: {
        block: { type: "string", description: "markdown of block" },
      }
    },
    validateBlockFunction
  ),
  delete: deleteBlockTool,
};
