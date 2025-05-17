import { BlockNoteEditor } from "@blocknote/core";

type BlocksWithCursor<T> = {
    id: string;
    block: T;
} | {
    cursor: true;
}

export function addCursorPosition<T>(editor: BlockNoteEditor<any, any, any>, source: Array<{
  id: string;
  block: T;
}>): Array<BlocksWithCursor<T>>
{
    const cursorPosition = editor.getTextCursorPosition();
    const ret: Array<BlocksWithCursor<T>> = [];

    for (const block of source) {
      const isBlockWithCursor = block.id === cursorPosition.block.id;

      ret.push({
          id: block.id,
          block: block.block,
      });

      if (isBlockWithCursor) {
        ret.push({
            cursor: true,
        });
      }
    }

    return ret;
}