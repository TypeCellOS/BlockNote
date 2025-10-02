import { createStreamToolsArraySchema } from "../../streamTool/jsonSchema.js";
import { HTMLPromptData } from "../formats/html-blocks/htmlPromptData.js";
import {
  PromptBuilder,
  PromptInputDataBuilder,
} from "../formats/PromptBuilder.js";
import { AIRequestSender } from "./types.js";

// TODO: naming
export function defaultAIRequestSender<E = HTMLPromptData>(
  promptBuilder: PromptBuilder<E>,
  promptInputDataBuilder: PromptInputDataBuilder<E>,
): AIRequestSender {
  return {
    async sendAIRequest(aiRequest, options) {
      // build the prompt data
      const promptData = await promptInputDataBuilder(aiRequest);

      // update the chat history with new messages based on the prompt data
      await promptBuilder(aiRequest.chat.messages, promptData);

      // submit the AI request via the underlying transport to the LLM
      return aiRequest.chat.sendMessage(undefined, {
        ...options,
        body: {
          ...(options?.body ?? {}),
          toolDefinitions: {
            applyDocumentOperations: {
              name: "applyDocumentOperations",
              inputSchema: createStreamToolsArraySchema(aiRequest.streamTools),
              outputSchema: { type: "object" },
            },
          },
        },
        // we pass the promptData as metadata
        // so the transport can decide whether or not to submit this to the server
        // (DefaultChatTransport will not)
        metadata: { promptData },
      });
    },
  };
}
