import { createStreamToolsArraySchema } from "../../streamTool/jsonSchema.js";
import { AIRequestSender } from "../../types.js";
import { HTMLPromptData } from "./html-blocks/htmlPromptData.js";
import { PromptBuilder, PromptInputDataBuilder } from "./PromptBuilder.js";

// TODO: naming
export function promptAIRequestSender<E = HTMLPromptData>(
  promptBuilder: PromptBuilder<E>,
  promptInputDataBuilder: PromptInputDataBuilder<E>,
): AIRequestSender {
  return {
    async sendAIRequest(aiRequest, options) {
      // build the prompt data
      const promptData = await promptInputDataBuilder(
        aiRequest.editor,
        aiRequest.blockNoteUserPrompt,
      );

      // update the chat history with new messages based on the prompt data
      await promptBuilder(aiRequest.chat.messages, promptData);

      // submit the AI request via the underlying transport to the LLM
      return aiRequest.chat.sendMessage(undefined, {
        ...options,
        body: {
          ...(options?.body ?? {}),
          streamTools: createStreamToolsArraySchema(
            aiRequest.blockNoteUserPrompt.streamTools,
          ),
        },
        // we pass the promptData as metadata
        // so the transport can decide whether or not to submit this to the server
        // (DefaultChatTransport will not)
        metadata: { promptData },
      });
    },
  };
}
