import { Block, BlockNoteEditor } from "@blocknote/core";
import { AIRequest } from "../aiRequest/types.js";
import {
  addCursorPosition,
  BlocksWithCursor,
} from "../promptHelpers/addCursorPosition.js";
import { convertBlocks } from "../promptHelpers/convertBlocks.js";
import { flattenBlocks } from "../promptHelpers/flattenBlocks.js";
import { suffixIDs } from "../promptHelpers/suffixIds.js";
import { trimEmptyBlocks } from "../promptHelpers/trimEmptyBlocks.js";

/**
 * A serializable version of the document state that can be passed to the backend.
 * This will be used as input to the LLM calls.
 */
export type DocumentState<T> =
  | {
      /**
       * No selection is active
       */
      selection: false;
      /**
       * The entire document and cursor position information.
       * Operations should be issued against these blocks and the cursor position can be used to determine the "attention" of the user
       * (i.e.: the AI suggestions should probably be made in / around the cursor position)
       */
      blocks: BlocksWithCursor<T>[];
      /**
       * Boolean to indicate if the document is empty
       */
      isEmptyDocument: boolean;
    }
  | {
      /**
       * A selection is active
       */
      selection: true;
      /**
       * The selected blocks. Operations should be issued against these blocks.
       */
      selectedBlocks: { id: string; block: T }[];
      /**
       * The entire document
       */
      blocks: { block: T }[];
      /**
       * Boolean to indicate if the document is empty
       */
      isEmptyDocument: boolean;
    };

/**
 * A function that builds the document state based on the AIRequest.
 *
 * This is split from the PromptBuilder so that for example, you can build the document state on the client side,
 * and run the PromptBuilder on the server side to modify the Messages sent to the LLM.
 */
export type DocumentStateBuilder<T> = (
  aiRequest: Omit<AIRequest, "documentState">,
) => Promise<DocumentState<T>>;

export function makeDocumentStateBuilder<T>(
  convertBlockFn: (
    editor: BlockNoteEditor<any, any, any>,
    block: Block<any, any, any>,
  ) => Promise<T>,
): DocumentStateBuilder<T> {
  return async (aiRequest: Omit<AIRequest, "documentState">) => {
    if (aiRequest.selectedBlocks) {
      return await getDocumentStateWithSelection(
        aiRequest.editor,
        convertBlockFn,
        {
          selectedBlocks: aiRequest.selectedBlocks,
        },
      );
    } else {
      return await getDocumentStateNoSelection(
        aiRequest.editor,
        convertBlockFn,
        {
          excludeBlockIds: aiRequest.emptyCursorBlockToDelete
            ? [aiRequest.emptyCursorBlockToDelete]
            : undefined,
        },
      );
    }
  };
}

async function getDocumentStateNoSelection<T>(
  editor: BlockNoteEditor<any, any, any>,
  convertBlockFn: (
    editor: BlockNoteEditor<any, any, any>,
    block: Block<any, any, any>,
  ) => Promise<T>,
  opts: {
    excludeBlockIds?: string[];
  },
): Promise<DocumentState<T>> {
  const isEmptyDocument = trimEmptyBlocks(editor.document).length === 0;
  const cursorBlockId = editor.getTextCursorPosition().block.id;
  const input = trimEmptyBlocks(editor.document, {
    cursorBlockId,
  });
  const blockArray = await convertBlocks(
    flattenBlocks(input),
    async (block) => {
      return convertBlockFn(editor, block);
    },
  );
  const withCursor = addCursorPosition(editor, blockArray);
  const filtered = withCursor.filter(
    (b) => "cursor" in b || !(opts.excludeBlockIds || []).includes(b.id),
  );
  const suffixed = suffixIDs(filtered);
  return {
    selection: false as const,
    blocks: suffixed,
    isEmptyDocument,
  };
}

async function getDocumentStateWithSelection<T>(
  editor: BlockNoteEditor<any, any, any>,
  convertBlockFn: (
    editor: BlockNoteEditor<any, any, any>,
    block: Block<any, any, any>,
  ) => Promise<T>,
  opts: {
    selectedBlocks: Block<any, any, any>[];
  },
): Promise<DocumentState<T>> {
  const isEmptyDocument = trimEmptyBlocks(editor.document).length === 0;
  const blockArray = await convertBlocks(
    flattenBlocks(opts.selectedBlocks),
    async (block) => {
      return convertBlockFn(editor, block);
    },
  );
  const suffixed = suffixIDs(blockArray);

  return {
    isEmptyDocument,
    selection: true as const,
    selectedBlocks: suffixed,
    blocks: (
      await convertBlocks(flattenBlocks(editor.document), async (block) => {
        return convertBlockFn(editor, block);
      })
    ).map(({ block }) => ({ block })), // strip ids so LLM can't accidentally issue updates to ids not in selection
  };
}
