import { Chat } from "@ai-sdk/react";
import { Block, BlockNoteEditor } from "@blocknote/core";
import { UIMessage } from "ai";
import { StreamTool } from "../../streamTool/streamTool.js";
import { ChatRequestOptions } from "../../types.js";

/**
 * An AIRequest represents a user request for an editor AI call
 */
export type AIRequest = {
  /**
   * The editor from which we can read document state
   */
  editor: BlockNoteEditor<any, any, any>;

  /**
   * The chat object (from the AI SDK)
   * is used to keep Message history, and to submit the LLM request via the underlying transport to the LLM
   */
  chat: Chat<UIMessage>;

  /**
   * The user's prompt
   */
  userPrompt: string;

  /**
   * The selection of the editor which the LLM should operate on
   */
  selectedBlocks?: Block<any, any, any>[];

  /**
   * The id of the block that should be excluded from the LLM call,
   * this is used when using the AI slash menu in an empty block
   */
  emptyCursorBlockToDelete?: string;

  /**
   * The stream tools that can be used by the LLM
   */
  streamTools: StreamTool<any>[];
};

/**
 * Responsible for submitting a BlockNote `AIRequest` to the Vercel AI SDK.
 */
export type AIRequestSender = {
  sendAIRequest: (
    AIRequest: AIRequest,
    options: ChatRequestOptions,
  ) => Promise<void>;
};
