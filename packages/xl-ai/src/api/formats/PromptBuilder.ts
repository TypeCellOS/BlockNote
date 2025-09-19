import { BlockNoteEditor } from "@blocknote/core";
import { UIMessage } from "ai";
import { BlockNoteUserPrompt } from "../../types.js";

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
 * A separate function that builds the input data for the PromptBuilder based on the BlockNoteUserPrompt and
 * current document (editor state).
 *
 * This is split from the PromptBuilder so that if you want, you can build the input data on the client side,
 * and run the PromptBuilder on the server side to modify the Messages sent to the LLM.
 *
 * The default implementation (using promptAIRequestSender) handles all of this client-side and just submits the
 * modified messages to the LLM.
 */
export type PromptInputDataBuilder<E> = (
  editor: BlockNoteEditor<any, any, any>,
  blockNoteUserPrompt: BlockNoteUserPrompt,
) => Promise<E>;
