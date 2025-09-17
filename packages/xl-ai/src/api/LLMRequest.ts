import { Chat } from "@ai-sdk/react";
import { BlockNoteEditor } from "@blocknote/core";
import { UIMessage } from "ai";
import { setupToolCallStreaming } from "../streamTool/vercelAiSdk/util/chatHandlers.js";
import { LLMRequestOptions } from "../types.js";
import { isEmptyParagraph } from "../util/emptyBlock.js";
import { defaultHTMLPromptBuilder } from "./formats/html-blocks/defaultHTMLPromptBuilder.js";
import { htmlBlockLLMFormat } from "./formats/html-blocks/htmlBlocks.js";
import { defaultHTMLPromptDataBuilder } from "./formats/html-blocks/htmlPromptData.js";
import { promptAIRequestSender } from "./formats/promptAIRequestSender.js";
import { trimEmptyBlocks } from "./promptHelpers/trimEmptyBlocks.js";

// TODO: figure out naming of this vs. aiRequest etc
export async function doLLMRequest(
  editor: BlockNoteEditor<any, any, any>,
  chat: Chat<UIMessage>,
  opts: LLMRequestOptions,
  onBlockUpdated?: (blockId: string) => void,
  onStart?: () => void,
) {
  const {
    userPrompt,
    useSelection,
    deleteEmptyCursorBlock,
    streamToolsProvider,
    promptBuilder,
    transport, // TODO: unused
    ...rest
  } = {
    deleteEmptyCursorBlock: true, // default true
    ...opts,
  };

  let { aiRequestSender } = {
    ...rest,
  };

  if (aiRequestSender && promptBuilder) {
    throw new Error("messageSender and promptBuilder cannot be used together");
  }

  if (!aiRequestSender) {
    aiRequestSender = promptAIRequestSender(
      promptBuilder ?? defaultHTMLPromptBuilder,
      defaultHTMLPromptDataBuilder,
    );
  }

  const cursorBlock = useSelection
    ? undefined
    : editor.getTextCursorPosition().block;

  const emptyCursorBlockToDelete: string | undefined =
    cursorBlock &&
    deleteEmptyCursorBlock &&
    isEmptyParagraph(cursorBlock) &&
    trimEmptyBlocks(editor.document).length > 0
      ? cursorBlock.id
      : undefined;

  const selectionInfo = useSelection
    ? editor.getSelectionCutBlocks()
    : undefined;

  const streamTools = (
    streamToolsProvider ?? htmlBlockLLMFormat.getStreamToolsProvider()
  ).getStreamTools(
    editor,
    selectionInfo
      ? {
          from: selectionInfo._meta.startPos,
          to: selectionInfo._meta.endPos,
        }
      : undefined,
    onBlockUpdated,
  );

  const executePromise = setupToolCallStreaming(streamTools, chat, () => {
    onStart?.();
    if (emptyCursorBlockToDelete) {
      editor.removeBlocks([emptyCursorBlockToDelete]);
    }
  });

  await aiRequestSender.sendAIRequest(
    {
      editor: editor,
      chat,
      blockNoteUserPrompt: {
        userPrompt,
        selectedBlocks: selectionInfo?.blocks,
        streamTools,
        emptyCursorBlockToDelete,
      },
    },
    opts.chatRequestOptions,
  );

  // TODO: what if no tool calls were made?
  await executePromise;
}
