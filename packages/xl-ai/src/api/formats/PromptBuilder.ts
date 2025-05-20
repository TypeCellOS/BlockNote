import { Block, BlockNoteEditor } from "@blocknote/core";
import { CoreMessage } from "ai";

/* 
We want users to be able to easily customize the prompts send to an LLM,
especially since different models might need slightly different prompts.

For this, we use PromptBuilders that the 

Every format (html, markdown, json) has a default PromptBuilder that is used if no custom one is provided,
which is also exposed as `llm.html.defaultPromptBuilder` etc. for possible reuse.
*/

/**
 * The input passed to a PromptBuilder
 */
export type PromptBuilderInput = {
  /**
   * The user's prompt
   */
  userPrompt: string;
  /**
   * The selection of the editor which the LLM should operate on
   */
  selectedBlocks?: Block<any, any, any>[];
  /**
   * The ids of blocks that should be excluded from the prompt
   * (e.g.: if `deleteEmptyCursorBlock` is true in the LLMRequest,
   * this will be the id of the block that should be ignored)
   */
  excludeBlockIds?: string[];
  /**
   * When following a multi-step conversation, or repairing a previous error,
   * the previous messages that have been sent to the LLM
   */
  previousMessages?: Array<CoreMessage>;
};

/**
 * A PromptBuilder is a function that takes a BlockNoteEditor and details about the user's promot
 * and turns it into an array of CoreMessage (AI SDK) to be passed to the LLM.
 */
export type PromptBuilder = (
  editor: BlockNoteEditor<any, any, any>,
  opts: PromptBuilderInput,
) => Promise<Array<CoreMessage>>;
