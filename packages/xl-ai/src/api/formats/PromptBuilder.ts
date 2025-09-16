import { Block, BlockNoteEditor } from "@blocknote/core";
import { UIMessage } from "ai";
import { StreamTool } from "../../streamTool/streamTool.js";

/* 
We want users to be able to easily customize the prompts send to an LLM,
especially since different models might need slightly different prompts.

For this, we use PromptBuilders that the 

Every format (html, markdown, json) has a default PromptBuilder that is used if no custom one is provided,
which is also exposed as `llm.html.defaultPromptBuilder` etc. for possible reuse.
*/

export type BlockNoteUserPrompt = {
  /**
   * The user's prompt
   */
  userPrompt: string;
  /**
   * The selection of the editor which the LLM should operate on
   */
  selectedBlocks?: Block<any, any, any>[];
  /**
   * The id of the block that should be excluded from the LLM call,
   * this is used when using the AI slash menu in an empty block
   */
  emptyCursorBlockToDelete?: string;

  /**
   * The stream tools that can be used by the LLM
   */
  streamTools: StreamTool<any>[];
};

/**
 * A PromptBuilder is a function that takes a BlockNoteEditor and details about the user's promot
 * and turns it into an array of CoreMessage (AI SDK) to be passed to the LLM.
 */
export type PromptBuilder<E> = (inputData: E) => Promise<Array<UIMessage>>;

export type PromptInputDataBuilder<E> = (
  editor: BlockNoteEditor<any, any, any>,
  blockNoteUserPrompt: BlockNoteUserPrompt,
) => Promise<E>;
