import { Chat } from "@ai-sdk/react";
import { UIMessage } from "ai";
import merge from "lodash.merge";
import {
  setupToolCallStreaming,
  streamToolsToToolSet,
  toolSetToToolDefinitions,
} from "../../streamTool/index.js";
import { AIRequest } from "./types.js";

/**
 * Submits a message to the LLM, similar to `chat.sendMessage`, but in addition:
 * - adds the document state to the message metadata
 * - sets up tool call streaming (so that BlockNote tool calls will be applied to the editor)
 *
 * (should not throw any errors)
 *
 * @param chat - the AI SDK Chat instance
 * @param aiRequest - the AI request (create using {@link buildAIRequest})
 * @param message - the message to send to the LLM (optional, defaults to the last message)
 * @param options - the `ChatRequestOptions` to pass to the `chat.sendMessage` method (custom metadata, body, etc)
 * @param abortSignal - Optional AbortSignal to cancel ongoing tool call operations
 *
 * @returns the result of the tool call processing. Consumer should check both `chat.status` and `result.ok`;
 * - `chat.status` indicates if the LLM request succeeeded
 * - `result` will indicate if the BlockNote tool calls were processed successfully
 */
export async function sendMessageWithAIRequest(
  chat: Chat<UIMessage>,
  aiRequest: AIRequest,
  message?: Parameters<Chat<UIMessage>["sendMessage"]>[0],
  options?: Parameters<Chat<UIMessage>["sendMessage"]>[1],
  abortSignal?: AbortSignal,
) {
  const sendingMessage = message ?? chat.lastMessage;

  if (!sendingMessage) {
    throw new Error("No message to send");
  }

  sendingMessage.metadata = merge(sendingMessage.metadata, {
    documentState: aiRequest.documentState,
  });

  const toolCallProcessing = setupToolCallStreaming(
    aiRequest.streamTools,
    chat,
    aiRequest.onStart,
    abortSignal,
  );
  options = merge(options, {
    metadata: {
      source: "blocknote-ai",
    },
    body: {
      toolDefinitions: await toolSetToToolDefinitions(
        streamToolsToToolSet(aiRequest.streamTools),
      ),
    },
  });

  await chat.sendMessage(message, options);

  const result = await toolCallProcessing;
  return result;
}
