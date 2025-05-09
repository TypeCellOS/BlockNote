import { CoreMessage } from "ai";
import { callLLMHTMLBlocks } from "./formats/html-blocks/htmlBlocks.js";
import { callLLMJSON } from "./formats/json/json.js";
import { callLLMMarkdownBlocks } from "./formats/markdown-blocks/markdownBlocks.js";

export const llm = {
  json: {
    call: callLLMJSON,
  },
  markdown: {
    call: callLLMMarkdownBlocks,
  },
  html: {
    call: callLLMHTMLBlocks,
  },
};

// TODO: good practice like this?
export type PromptOrMessages =
  | {
      useSelection?: boolean;
      userPrompt: string;
      messages?: never;
    }
  | {
      useSelection?: never;
      userPrompt?: never;
      messages: Array<CoreMessage>;
    };
