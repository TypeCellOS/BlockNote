import { Chat } from "@ai-sdk/react";
import { ChatTransport, UIMessage } from "ai";
import { AIRequestSender, StreamToolsProvider } from "./index.js";

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

  /**
   * Responsible for submitting a BlockNote `AIRequest` to the Vercel AI SDK.
   * Use this to transform the messages sent to the LLM
   *
   * @default `defaultAIRequestSender(aiDocumentFormats.html.defaultPromptBuilder, aiDocumentFormats.html.defaultPromptInputDataBuilder)`
   */
  aiRequestSender?: AIRequestSender;
};

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
