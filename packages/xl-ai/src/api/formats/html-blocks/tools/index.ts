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
import { getPartialHTML } from "./getPartialHTML.js";
import { createHTMLRebaseTool } from "./rebaseTool.js";
import { validateBlockFunction } from "./validate.js";

export const tools = {
  add: createAddBlocksTool<string>({
    description: "Insert new blocks",
    schema: {
      block: {
        type: "string",
        description: "html of block (MUST be a single HTML element)",
      },
    },
    validateBlock: validateBlockFunction,
    rebaseTool: createHTMLRebaseTool,
    toJSONToolCall: async (editor, chunk) => {
      const initialMockID = (window as any).__TEST_OPTIONS?.mockID;

      const blocks = (
        await Promise.all(
          chunk.operation.blocks.map(async (html) => {
            const parsedHtml = chunk.isPossiblyPartial
              ? getPartialHTML(html)
              : html;
            if (!parsedHtml) {
              return [];
            }
            return (await editor.tryParseHTMLToBlocks(parsedHtml)).map(
              (block) => {
                delete (block as any).id;
                return block;
              },
            );
          }),
        )
      ).flat();

      // hacky
      if ((window as any).__TEST_OPTIONS) {
        (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS.mockID =
          initialMockID;
      }

      if (blocks.length === 0) {
        return undefined;
      }

      return {
        ...chunk.operation,
        blocks,
      } satisfies AddBlocksToolCall<PartialBlock<any, any, any>>;
    },
  }),
  update: createUpdateBlockTool<string>({
    description: "Update a block",
    schema: {
      block: {
        type: "string",
        description: "html of block (MUST be a single HTML element)",
      },
    },
    validateBlock: validateBlockFunction,
    rebaseTool: createHTMLRebaseTool,
    toJSONToolCall: async (editor, chunk) => {
      const html = chunk.isPossiblyPartial
        ? getPartialHTML(chunk.operation.block)
        : chunk.operation.block;

      if (!html) {
        return undefined;
      }

      const block = (await editor.tryParseHTMLToBlocks(html))[0];

      // console.log("update", operation.block);
      // console.log("html", html);
      // hacky
      if ((window as any).__TEST_OPTIONS) {
        (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS.mockID =
          undefined;
      }

      delete (block as any).id;

      return {
        ...chunk.operation,
        block,
      } satisfies UpdateBlockToolCall<PartialBlock<any, any, any>>;
    },
  }),
  delete: deleteBlockTool,
};
