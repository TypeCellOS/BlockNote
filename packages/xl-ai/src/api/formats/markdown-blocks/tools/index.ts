import { createAddBlocksTool } from "../../../tools/createAddBlocksTool.js";
import { createUpdateBlockTool } from "../../../tools/createUpdateBlockTool.js";
import { deleteBlockTool } from "../../../tools/delete.js";
import { validateBlockFunction } from "./validate.js";

export const tools = {
  add: createAddBlocksTool<string>(
    "Insert new blocks",
    {
      type: "string",
      description: "markdown",
    },
    validateBlockFunction
  ),
  update: createUpdateBlockTool<string>(
    "Update a block",
    {
      type: "string",
      description: "markdown",
    },
    validateBlockFunction
  ),
  delete: deleteBlockTool,
};
