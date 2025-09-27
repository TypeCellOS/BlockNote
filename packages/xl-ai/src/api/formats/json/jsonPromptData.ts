import { Block, BlockNoteEditor } from "@blocknote/core";
import { AIRequest } from "../../../index.js";
import { addCursorPosition } from "../../promptHelpers/addCursorPosition.js";
import { convertBlocks } from "../../promptHelpers/convertBlocks.js";
import { flattenBlocks } from "../../promptHelpers/flattenBlocks.js";
import { suffixIDs } from "../../promptHelpers/suffixIds.js";
import { trimEmptyBlocks } from "../../promptHelpers/trimEmptyBlocks.js";

export type JSONPromptData = (
  | Awaited<ReturnType<typeof getDataForPromptNoSelection>>
  | Awaited<ReturnType<typeof getDataForPromptWithSelection>>
) & {
  userPrompt: string;
};

export async function defaultJSONPromptDataBuilder(aiRequest: AIRequest) {
  if (aiRequest.selectedBlocks) {
    return {
      ...(await getDataForPromptWithSelection(aiRequest.editor, {
        selectedBlocks: aiRequest.selectedBlocks,
      })),
      userPrompt: aiRequest.userPrompt,
    };
  } else {
    return {
      ...(await getDataForPromptNoSelection(aiRequest.editor, {
        excludeBlockIds: aiRequest.emptyCursorBlockToDelete
          ? [aiRequest.emptyCursorBlockToDelete]
          : undefined,
      })),
      userPrompt: aiRequest.userPrompt,
    };
  }
}

export async function getDataForPromptNoSelection(
  editor: BlockNoteEditor<any, any, any>,
  opts: {
    excludeBlockIds?: string[];
  },
) {
  const isEmptyDocument = trimEmptyBlocks(editor.document).length === 0;
  const cursorBlockId = editor.getTextCursorPosition().block.id;
  const input = trimEmptyBlocks(editor.document, {
    cursorBlockId,
  });
  const blockArray = await convertBlocks(
    flattenBlocks(input),
    async (block) => {
      return {
        ...block,
        children: undefined,
      };
    },
  );
  const withCursor = addCursorPosition(editor, blockArray);
  const filtered = withCursor.filter(
    (b) => "cursor" in b || !(opts.excludeBlockIds || []).includes(b.id),
  );
  const suffixed = suffixIDs(filtered);
  return {
    selection: false as const,
    jsonBlocks: suffixed,
    isEmptyDocument,
  };
}

export async function getDataForPromptWithSelection(
  editor: BlockNoteEditor<any, any, any>,
  opts: {
    selectedBlocks: Block<any, any, any>[];
  },
) {
  const isEmptyDocument = trimEmptyBlocks(editor.document).length === 0;
  const blockArray = await convertBlocks(
    flattenBlocks(opts.selectedBlocks),
    async (block) => {
      return block;
    },
  );
  const suffixed = suffixIDs(blockArray);

  return {
    isEmptyDocument,
    selection: true as const,
    jsonSelectedBlocks: suffixed,
    jsonDocument: (
      await convertBlocks(flattenBlocks(editor.document), async (block) => {
        return {
          ...block,
          id: undefined, // don't pass id, because LLM should use `jsonSelectedBlocks` for this
          children: undefined,
        };
      })
    ).map(({ block }) => ({ block })), // strip ids so LLM can't accidentally issue updates to ids not in selection
  };
}
