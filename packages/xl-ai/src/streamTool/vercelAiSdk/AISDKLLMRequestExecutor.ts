import { ChatTransport, UIMessage } from "ai";
import { ExecuteLLMRequestOptions } from "../../api/LLMRequest.js";
import { LLMResponse } from "../../api/LLMResponse.js";
import { UIMessageStreamToOperationsResult } from "./util/UIMessageStreamToOperationsResult.js";

/**
 * Creates a LLMRequestExecutor based on a AI SDK Transport
 */
export function createAISDKLLMRequestExecutor(opts: {
  /**
   * The transport to use for the LLM call
   */
  transport: ChatTransport<UIMessage>;
}) {
  const { transport } = opts;
  return async (opts: ExecuteLLMRequestOptions) => {
    const { messages, streamTools, onStart } = opts;

    // TODO: add support for streamText / generateText and tool calls

    const response = await transport.sendMessages({
      messages,
      trigger: "submit-message",
      chatId: "1",
      messageId: undefined,
      abortSignal: undefined,
      body: {
        streamTools,
      },
    });

    // TODO: needed here or move outside?
    const parsedResponse = await UIMessageStreamToOperationsResult(
      response,
      streamTools,
      onStart,
    );
    return new LLMResponse(messages, parsedResponse, streamTools);
  };
}
