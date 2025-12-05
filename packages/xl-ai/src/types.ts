import type { Chat } from "@ai-sdk/react";
import { ChatTransport, UIMessage } from "ai";
import { DocumentStateBuilder, StreamToolsProvider } from "./index.js";

/**
 * Extra options (header, body, metadata) that can be passed to LLM requests
 * This is a pattern we take from the Vercel AI SDK
 */
export type ChatRequestOptions = Parameters<Chat<UIMessage>["sendMessage"]>[1];

export type AIRequestHelpers = {
  /**
   * The Vercel AI SDK transport is responsible for sending the AI SDK Request to the LLM backend
   *
   * Implement this function if you want to:
   * - use a custom backend
   * - change backend URLs
   * - use a different transport layer (e.g.: websockets)
   */
  transport?: ChatTransport<UIMessage>;

  /**
   * Customize which stream tools are available to the LLM
   */
  streamToolsProvider?: StreamToolsProvider<any, any>;

  /**
   * Extra options (header, body, metadata) that can be passed to LLM requests
   * This is a pattern we take from the Vercel AI SDK
   */
  chatRequestOptions?: ChatRequestOptions;

  documentStateBuilder?: DocumentStateBuilder<any>;
} & (
  | {
      /**
       * Use the ChatProvider to customize how the AI SDK Chat instance (orchestrating Message lifecycle) is created
       */
      chatProvider?: () => Chat<UIMessage>;
      /**
       * Not valid if chatProvider is provided
       */
      transport?: never;
    }
  | {
      /**
       * Not valid if transport is provided
       */
      chatProvider?: never;
      /**
       * The Vercel AI SDK transport is responsible for sending the AI SDK Request to the LLM backend
       *
       * Implement this function if you want to:
       * - use a custom backend
       * - change backend URLs
       * - use a different transport layer (e.g.: websockets)
       */
      transport: ChatTransport<UIMessage>;
    }
);

export type InvokeAIOptions = {
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
} & AIRequestHelpers;
