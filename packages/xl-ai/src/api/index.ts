import { callLLMHTMLBlocks } from "./formats/html-blocks/htmlBlocks.js";
import { defaultHTMLPromptBuilder } from "./formats/html-blocks/htmlBlocksPrompt.js";
import {
  getDataForPromptNoSelection,
  getDataForPromptWithSelection,
} from "./formats/html-blocks/htmlPromptData.js";
import { callLLMJSON } from "./formats/json/json.js";
import { callLLMMarkdownBlocks } from "./formats/markdown-blocks/markdownBlocks.js";

export const llm = {
  _experimental_json: {
    call: callLLMJSON,
  },
  _experimental_markdown: {
    call: callLLMMarkdownBlocks,
  },
  html: {
    /**
     * Execute an LLM call using HTML blocks as format to be passed to the LLM
     */
    call: callLLMHTMLBlocks,
    /**
     * The default PromptBuilder that determines how a userPrompt is converted to an array of
     * LLM Messages (CoreMessage[])
     */
    defaultPromptBuilder: defaultHTMLPromptBuilder,
    /**
     * Helper functions which can be used when implementing a custom PromptBuilder
     */
    promptHelpers: {
      getDataForPromptWithSelection,
      getDataForPromptNoSelection,
    },
  },
};
