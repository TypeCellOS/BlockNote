import { PartialBlock } from "@blocknote/core";

import {
  getApplySuggestionsTr,
  rebaseTool,
} from "../../../../prosemirror/rebaseTool.js";
import { createAddBlocksTool } from "../../base-tools/createAddBlocksTool.js";
import { createUpdateBlockTool } from "../../base-tools/createUpdateBlockTool.js";
import { deleteBlockTool } from "../../base-tools/delete.js";
import { validateBlockFunction } from "./validate.js";

export const tools = {
  add: createAddBlocksTool<PartialBlock<any, any, any>>({
    description: "Insert new blocks",
    schema: {
      block: {
        $ref: "#/$defs/block",
      },
      // TODO: add defs?
    },
    validateBlock: validateBlockFunction,
    rebaseTool: async (_id, editor) =>
      rebaseTool(editor, getApplySuggestionsTr(editor)),
    toJSONToolCall: async (_editor, chunk) => {
      return chunk.operation;
    },
  }),
  update: createUpdateBlockTool<PartialBlock<any, any, any>>({
    description:
      "Update a block, the new block will replace the existing block.",
    schema: {
      block: {
        $ref: "#/$defs/block",
      },
    },
    validateBlock: validateBlockFunction,
    rebaseTool: async (_id, editor) =>
      rebaseTool(editor, getApplySuggestionsTr(editor)),
    toJSONToolCall: async (_editor, chunk) => {
      return chunk.operation;
    },
  }),
  delete: deleteBlockTool,
};

export type Tools = ReturnType<(typeof tools)[keyof typeof tools]>;
