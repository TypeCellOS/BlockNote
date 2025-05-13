import { defaultProps, type PartialBlock } from "@blocknote/core";
import {
  getApplySuggestionsTr,
  rebaseTool,
} from "../../../../prosemirror/rebaseTool.js";
import { blockNoteSchemaToJSONSchema } from "../../../schema/schemaToJSONSchema.js";
import { createAddBlocksTool } from "../../base-tools/createAddBlocksTool.js";
import { createUpdateBlockTool } from "../../base-tools/createUpdateBlockTool.js";
import { deleteBlockTool } from "../../base-tools/delete.js";
import { validateBlockFunction } from "./validate.js";

export const tools = {
  add: createAddBlocksTool<PartialBlock<any, any, any>>({
    description: "Insert new blocks",
    schema: (editor) => ({
      block: {
        $ref: "#/$defs/block",
      },
      ...(blockNoteSchemaToJSONSchema(editor.schema) as any),
    }),
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
    schema: (editor) => ({
      block: {
        $ref: "#/$defs/block",
      },
      ...(blockNoteSchemaToJSONSchema(editor.schema) as any),
    }),
    validateBlock: validateBlockFunction,
    rebaseTool: async (_id, editor) =>
      rebaseTool(editor, getApplySuggestionsTr(editor)),
    toJSONToolCall: async (_editor, chunk) => {
      const defaultPropsVals = Object.fromEntries(
        Object.entries(defaultProps).map(([key, val]) => {
          return [key, val.default];
        }),
      );

      return {
        ...chunk.operation,
        block: {
          ...chunk.operation.block,
          props: {
            ...defaultPropsVals,
            ...chunk.operation.block.props,
          },
        },
      };
    },
  }),
  delete: deleteBlockTool,
};

export type Tools = ReturnType<(typeof tools)[keyof typeof tools]>;
