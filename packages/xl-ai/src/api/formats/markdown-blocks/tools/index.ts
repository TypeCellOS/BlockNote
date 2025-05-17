import { PartialBlock } from "@blocknote/core";
import {
  AddBlocksToolCall,
  createAddBlocksTool,
} from "../../base-tools/createAddBlocksTool.js";
import {
  createUpdateBlockTool,
  UpdateBlockToolCall,
} from "../../base-tools/createUpdateBlockTool.js";
import { deleteBlockTool } from "../../base-tools/delete.js";
import { createMDRebaseTool } from "./rebaseTool.js";
import { validateBlockFunction } from "./validate.js";

export const tools = {
  add: createAddBlocksTool<string>({
    description: "Insert new blocks",
    schema: {
      block: {
        $ref: "#/$defs/block",
      },
      $defs: {
        block: { type: "string", description: "markdown of block" },
      },
    },
    validateBlock: validateBlockFunction,
    rebaseTool: createMDRebaseTool,
    toJSONToolCall: async (editor, chunk) => {
      const blocks = await Promise.all(
        chunk.operation.blocks.map(async (md) => {
          const block = (await editor.tryParseMarkdownToBlocks(md.trim()))[0]; // TODO: trim
          delete (block as any).id;
          return block;
        }),
      );

      // hacky
      if ((window as any).__TEST_OPTIONS) {
        (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS.mockID =
          undefined;
      }

      return {
        ...chunk.operation,
        blocks,
      } satisfies AddBlocksToolCall<PartialBlock<any, any, any>>;
    },
  }),
  update: createUpdateBlockTool<string>({
    description:
      "Update a block, the new block will replace the existing block.",
    schema: {
      block: {
        $ref: "#/$defs/block",
      },
      $defs: {
        block: { type: "string", description: "markdown of block" },
      },
    },
    validateBlock: validateBlockFunction,
    rebaseTool: createMDRebaseTool,
    toJSONToolCall: async (editor, chunk) => {
      const block = (
        await editor.tryParseMarkdownToBlocks(chunk.operation.block.trim())
      )[0];

      delete (block as any).id;
      // console.log("update", operation.block);
      // console.log("md", block);
      // hacky
      if ((window as any).__TEST_OPTIONS) {
        (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS.mockID =
          undefined;
      }

      return {
        ...chunk.operation,
        block,
      } satisfies UpdateBlockToolCall<PartialBlock<any, any, any>>;
    },
  }),
  delete: deleteBlockTool,
};
