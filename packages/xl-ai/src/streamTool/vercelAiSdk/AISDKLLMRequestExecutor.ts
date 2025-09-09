import { Chat } from "@ai-sdk/react";
import { ChatTransport, UIMessage } from "ai";
import { ExecuteLLMRequestOptions } from "../../api/LLMRequest.js";
import { LLMResponse } from "../../api/LLMResponse.js";

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

    const chat = new Chat({
      transport,
      messages,
      onData: (data) => {
        console.log("onData");
        console.log(data);
      },
      onToolCall: (toolCall) => {
        console.log("onToolCall");
        console.log(toolCall);
      },
      onError: (error) => {
        console.log("onError");
        console.log(error);
      },
    });

    chat["~registerMessagesCallback"](() => {
      console.log(chat.messages[chat.messages.length - 1]);
      // process partial tool call here
    });

    await chat.sendMessage({
      role: "user",
      parts: [{ type: "text", text: "do it" }],
      metadata: {
        streamTools: {
          add: {
            name: "add",
            inputSchema: streamTools[0].inputSchema,
            description: streamTools[0].description,
          },
        },
      },
    });

    return new LLMResponse(chat.messages, undefined as any, streamTools);

    // TODO: add support for streamText / generateText and tool calls

    // const response = await transport.sendMessages({
    //   messages,
    //   trigger: "submit-message",
    //   chatId: "1",
    //   messageId: undefined,
    //   abortSignal: undefined,
    //   body: {
    //     streamTools,
    //   },
    // });

    // // TODO: needed here or move outside?
    // const parsedResponse = await UIMessageStreamToOperationsResult(
    //   response,
    //   streamTools,
    //   onStart,
    // );
    // return new LLMResponse(messages, parsedResponse, streamTools);
  };
}
