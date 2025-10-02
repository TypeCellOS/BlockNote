import { UIMessage } from "ai";
import { AIRequest } from "../../index.js";

/**
 * We want users to be able to easily customize the prompts send to an LLM,
 * especially since different models / use-cases might need slightly different prompts.

 * A PromptBuilder is a function that takes information about the document and user prompt (inputData),
 * and modifies the messages to be sent to the LLM (`messages` array).
 */
export type PromptBuilder<E> = (
  messages: UIMessage[],
  inputData: E,
) => Promise<void>;

/**
 * A separate function that builds the input data for the PromptBuilder based on the AIRequest.
 *
 * This is split from the PromptBuilder so that for example, you can build the input data on the client side,
 * and run the PromptBuilder on the server side to modify the Messages sent to the LLM.
 */
export type PromptInputDataBuilder<E> = (aiRequest: AIRequest) => Promise<E>;
