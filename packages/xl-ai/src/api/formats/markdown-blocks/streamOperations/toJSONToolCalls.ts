import {
  BlockNoteEditor,
  PartialBlock,
  UnreachableCaseError
} from "@blocknote/core";
import { StreamToolCall } from "../../../streamTool/streamTool.js";
import { AddBlocksToolCall } from "../../../tools/createAddBlocksTool.js";
import { UpdateBlockToolCall } from "../../../tools/createUpdateBlockTool.js";
import { DeleteBlockToolCall } from "../../../tools/delete.js";

export async function* toJSONToolCalls(
  editor: BlockNoteEditor<any, any, any>,
  operationsSource: AsyncIterable<{
    operation: StreamToolCall<any>;
    isUpdateToPreviousOperation: boolean;
    isPossiblyPartial: boolean;
  }>
): AsyncGenerator<{
  operation: StreamToolCall<any>;
  isUpdateToPreviousOperation: boolean;
  isPossiblyPartial: boolean;
}> {
  for await (const chunk of operationsSource) {
    const operation = chunk.operation;
    console.log("operation", operation);
    if (!isBuiltInToolCall(operation)) {
      yield chunk;
      continue;
    }

    if (operation.type === "add") {
      const blocks = await Promise.all(
        operation.blocks.map(async (md) => {
          const block = (await editor.tryParseMarkdownToBlocks(md.trim()))[0]; // TODO: trim
          delete (block as any).id;
          return block;
        })
      );

      // hacky
      if ((window as any).__TEST_OPTIONS) {
        (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS.mockID = 0;
      }

      yield {
        ...chunk,
        operation: {
          ...chunk.operation,
          blocks,
        } as AddBlocksToolCall<PartialBlock<any, any, any>>,
      };
    } else if (operation.type === "update") {
      // console.log("update", operation.block);
      const block = (
        await editor.tryParseMarkdownToBlocks(operation.block.trim())
      )[0];

      delete (block as any).id;
      // console.log("update", operation.block);
      // console.log("md", block);
      // hacky
      if ((window as any).__TEST_OPTIONS) {
        (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS.mockID = 0;
      }

      yield {
        ...chunk,
        operation: {
          ...operation,
          block,
        } as UpdateBlockToolCall<PartialBlock<any, any, any>>,
      };
    } else if (operation.type === "delete") {
      yield {
        ...chunk,
        operation: {
          ...operation,
        } as DeleteBlockToolCall,
      };
    } else {
      // @ts-expect-error Apparently TS gets lost here
      throw new UnreachableCaseError(operation);
    }
  }
}

function isBuiltInToolCall(
  operation: unknown
): operation is
  | UpdateBlockToolCall<string>
  | AddBlocksToolCall<string>
  | DeleteBlockToolCall {
  return (
    typeof operation === "object" &&
    operation !== null &&
    "type" in operation &&
    (operation.type === "update" ||
      operation.type === "add" ||
      operation.type === "delete")
  );
}
