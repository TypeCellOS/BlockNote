import { Block, BlockNoteEditor } from "@blocknote/core";
import { addCursorPosition } from "../../promptHelpers/addCursorPosition.js";
import { convertBlocks } from "../../promptHelpers/convertBlocks.js";
import { flattenBlocks } from "../../promptHelpers/flattenBlocks.js";
import { suffixIDs } from "../../promptHelpers/suffixIds.js";
import { trimEmptyBlocks } from "../../promptHelpers/trimEmptyBlocks.js";

export async function getDataForPromptNoSelection(
  editor: BlockNoteEditor<any, any, any>,
  opts: {
    excludeBlockIds?: string[];
  },
) {
  const input = trimEmptyBlocks(editor.document);
  const blockArray = await convertBlocks(
    flattenBlocks(input),
    async (block) => {
      return editor.blocksToHTMLLossy([block]);
    },
  );
  const withCursor = addCursorPosition(editor, blockArray);
  const filtered = withCursor.filter(
    (b) => "cursor" in b || !(opts.excludeBlockIds || []).includes(b.id),
  );
  const suffixed = suffixIDs(filtered);
  return {
    htmlBlocks: suffixed,
  };
}

export async function getDataForPromptWithSelection(
  editor: BlockNoteEditor<any, any, any>,
  opts: {
    selectedBlocks: Block<any, any, any>[];
  },
) {
  const blockArray = await convertBlocks(
    flattenBlocks(opts.selectedBlocks),
    async (block) => {
      return editor.blocksToHTMLLossy([block]);
    },
  );
  const suffixed = suffixIDs(blockArray);

  return {
    htmlSelectedBlocks: suffixed,
    htmlDocument: (
      await convertBlocks(flattenBlocks(editor.document), async (block) => {
        return editor.blocksToHTMLLossy([block]);
      })
    ).map(({ block }) => ({ block })), // strip ids so LLM can't accidentally issue updates to ids not in selection
  };
}
