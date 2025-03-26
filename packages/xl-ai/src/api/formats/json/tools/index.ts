import { PartialBlock } from "@blocknote/core";

import { createAddBlocksTool } from "../../../tools/createAddBlocksTool.js";
import { createUpdateBlockTool } from "../../../tools/createUpdateBlockTool.js";
import { deleteBlockTool } from "../../../tools/delete.js";
import { validateBlockFunction } from "./validate.js";

export const tools = {
  add: createAddBlocksTool<PartialBlock<any, any, any>>(
    "Insert new blocks",
    {
      $ref: "#/$defs/block",
    },
    validateBlockFunction
  ),
  update: createUpdateBlockTool<PartialBlock<any, any, any>>(
    "Update a block, the new block will replace the existing block.",
    {
      $ref: "#/$defs/block",
    },
    validateBlockFunction
  ),
  delete: deleteBlockTool,
};
