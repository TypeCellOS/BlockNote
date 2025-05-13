import { CoreMessage } from "ai";
import { callLLMHTMLBlocks } from "./formats/html-blocks/htmlBlocks.js";
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
    call: callLLMHTMLBlocks,
  },
};

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
