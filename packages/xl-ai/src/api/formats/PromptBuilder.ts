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
  excludeBlockIds?: string[];
  selectedBlocks?: Block<any, any, any>[];
  userPrompt: string;
};

/**
 * A PromptBuilder is a function that takes a BlockNoteEditor and details about the user's promot
 * and turns it into an array of CoreMessage to be passed to the LLM.
 */
export type PromptBuilder = (
  editor: BlockNoteEditor<any, any, any>,
  opts: PromptBuilderInput,
) => Promise<Array<CoreMessage>>;
