import { AIRequestSender } from "../../types.js";
import { HTMLPromptData } from "./html-blocks/htmlPromptData.js";
import { PromptBuilder, PromptInputDataBuilder } from "./PromptBuilder.js";

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
        metadata: {
          ...(options?.metadata ?? {}),
          // TODO: metadata or body?
          // TODO: where is this translated to JSON??
          streamTools: aiRequest.blockNoteUserPrompt.streamTools,
        },
      });
    },
  };
}
