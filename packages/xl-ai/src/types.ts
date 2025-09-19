import { Chat } from "@ai-sdk/react";
import { Block, BlockNoteEditor } from "@blocknote/core";
import { ChatTransport, UIMessage } from "ai";
import type { PromptBuilder } from "./api/formats/PromptBuilder.js";
import { HTMLPromptData } from "./api/formats/html-blocks/htmlPromptData.js";
import { StreamToolsProvider } from "./index.js";
import { StreamTool } from "./streamTool/streamTool.js";

/**
 * Extra options (header, body, metadata) that can be passed to LLM requests
 * This is a pattern we take from the Vercel AI SDK
 */
export type ChatRequestOptions = Parameters<Chat<UIMessage>["sendMessage"]>[1];

/**
 * Information about the user request and which streamtools are available
 */
export type BlockNoteUserPrompt = {
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
   * Information about the user request and which streamtools are available
   */
  blockNoteUserPrompt: BlockNoteUserPrompt;
};

/**
 * Responsible for sending the AI request to the LLM backend
 */
export type AIRequestSender = {
  sendAIRequest: (
    AIRequest: AIRequest,
    options: ChatRequestOptions,
  ) => Promise<void>;
};

export type LLMRequestHelpers = {
  /**
   * Customize how your LLM backend is called.
   * Implement this function if you want to call a backend that is not compatible with
   * the Vercel AI SDK
   */
  transport?: ChatTransport<UIMessage>;

  /**
   * Customize which stream tools are available to the LLM
   */
  streamToolsProvider?: StreamToolsProvider;

  /**
   * Extra options (header, body, metadata) that can be passed to LLM requests
   * This is a pattern we take from the Vercel AI SDK
   */
  chatRequestOptions?: ChatRequestOptions;
} & (
  | {
      /**
       * The `PromptBuilder` to use for the LLM call
       *
       * (A PromptBuilder is a function that takes a BlockNoteEditor and details about the user's prompt
       * and turns it into an AI SDK `CoreMessage` array to be passed to the LLM)
       *
       * TODO
       * @default provided by the format (e.g. `llm.html.defaultPromptBuilder`)
       */
      promptBuilder?: PromptBuilder<HTMLPromptData>;

      aiRequestSender?: never;
    }
  | {
      // aiRequestSender variant
      promptBuilder?: never;
      /**
       * Responsible for sending the AI request to the LLM backend
       *
       * @default promptAIRequestSender
       */
      aiRequestSender?: AIRequestSender;
    }
);

export type LLMRequestOptions = {
  /**
   * The user prompt to use for the LLM call
   */
  userPrompt: string;

  /**
   * Whether to use the editor selection for the LLM call
   *
   * @default true
   */
  useSelection?: boolean;
  /**
   * If the user's cursor is in an empty paragraph, automatically delete it when the AI
   * is starting to write.
   *
   * (This is used when a user starts typing `/ai` in an empty block)
   *
   * @default true
   */
  deleteEmptyCursorBlock?: boolean;
} & LLMRequestHelpers;
