import { BlockNoteEditor } from "@blocknote/core";
import { BlockNoteOperation } from "../../functions/blocknoteFunctions.js";

/**
 * Applies the operations to the editor and yields the results.
 */
export async function* applyOperations(
  editor: BlockNoteEditor,
  operationsStream: AsyncIterable<{
    operation: BlockNoteOperation;
  }>
): AsyncGenerator<{
  operation: BlockNoteOperation;
  result: "ok";
  lastBlockId: string;
}> {
  for await (const chunk of operationsStream) {
    if (chunk.operation.type === "insert") {
      const ret = editor.insertBlocks(
        chunk.operation.blocks,
        chunk.operation.referenceId,
        chunk.operation.position
      );
      yield {
        operation: chunk.operation,
        result: "ok",
        lastBlockId: ret[ret.length - 1].id,
      };
    } else if (chunk.operation.type === "update") {
      editor.updateBlock(chunk.operation.id, chunk.operation.block);
      yield {
        operation: chunk.operation,
        result: "ok",
        lastBlockId: chunk.operation.id,
      };
    } else if (chunk.operation.type === "remove") {
      const prevBlock = editor.getPrevBlock(chunk.operation.ids[0])!;
      editor.removeBlocks(chunk.operation.ids);
      yield {
        operation: chunk.operation,
        result: "ok",
        lastBlockId: prevBlock.id,
      };
    }
  }
}
