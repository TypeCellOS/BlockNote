import { Chat } from "@ai-sdk/react";
import { BlockNoteEditor } from "@blocknote/core";
import { ChatRequestOptions, UIMessage } from "ai";
import { setupToolCallStreaming } from "../../streamTool/vercelAiSdk/util/chatHandlers.js";
import { isEmptyParagraph } from "../../util/emptyBlock.js";
import { llmFormats, StreamToolsProvider } from "../index.js";
import { trimEmptyBlocks } from "../promptHelpers/trimEmptyBlocks.js";
import { AIRequest, AIRequestSender } from "./types.js";

export function buildAIRequest(opts: {
  editor: BlockNoteEditor<any, any, any>;
  chat: Chat<UIMessage>;
  userPrompt: string;
  useSelection?: boolean;
  deleteEmptyCursorBlock?: boolean;
  streamToolsProvider?: StreamToolsProvider;
  onBlockUpdated?: (blockId: string) => void;
}) {
  const { useSelection, deleteEmptyCursorBlock, streamToolsProvider } = {
    ...opts,
    useSelection: opts.useSelection ?? false,
    deleteEmptyCursorBlock: opts.deleteEmptyCursorBlock ?? true,
    streamToolsProvider:
      opts.streamToolsProvider ?? llmFormats.html.getStreamToolsProvider(),
  };
  const cursorBlock = useSelection
    ? undefined
    : opts.editor.getTextCursorPosition().block;

  const emptyCursorBlockToDelete: string | undefined =
    cursorBlock &&
    deleteEmptyCursorBlock &&
    isEmptyParagraph(cursorBlock) &&
    trimEmptyBlocks(opts.editor.document).length > 0
      ? cursorBlock.id
      : undefined;

  const selectionInfo = useSelection
    ? opts.editor.getSelectionCutBlocks()
    : undefined;

  const streamTools = streamToolsProvider.getStreamTools(
    opts.editor,
    selectionInfo
      ? {
          from: selectionInfo._meta.startPos,
          to: selectionInfo._meta.endPos,
        }
      : undefined,
    opts.onBlockUpdated,
  );

  return {
    editor: opts.editor,
    chat: opts.chat,
    userPrompt: opts.userPrompt,
    selectedBlocks: selectionInfo?.blocks,
    streamTools,
    emptyCursorBlockToDelete,
  };
}

/**
 * Sends an LLM Request to the LLM backend and processes streaming tool calls
 * made by the LLM
 */
export async function executeAIRequest(opts: {
  aiRequest: AIRequest;
  sender: AIRequestSender;
  chatRequestOptions?: ChatRequestOptions;
  onStart?: () => void;
}) {
  const { aiRequest, sender, chatRequestOptions, onStart } = opts;
  const executePromise = setupToolCallStreaming(
    aiRequest.streamTools,
    aiRequest.chat,
    () => {
      onStart?.();
      if (
        aiRequest.emptyCursorBlockToDelete &&
        aiRequest.editor.getBlock(aiRequest.emptyCursorBlockToDelete)
      ) {
        aiRequest.editor.removeBlocks([aiRequest.emptyCursorBlockToDelete]);
      }
    },
  );

  await sender.sendAIRequest(aiRequest, chatRequestOptions);

  // TODO: what if no tool calls were made?
  await executePromise;
}
