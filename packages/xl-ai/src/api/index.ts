import { CoreMessage } from "ai";
import { callLLM as callLLMHTML } from "./formats/html-blocks/htmlBlocks.js";
import { callLLM as callLLMJSON } from "./formats/json/json.js";
import { callLLM as callLLMMarkdown } from "./formats/markdown-blocks/markdownBlocks.js";

export const llm = {
  json: {
    call: callLLMJSON,
  },
  markdown: {
    call: callLLMMarkdown,
  },
  html: {
    call: callLLMHTML,
  },
};

// TODO: good practice like this?
export type PromptOrMessages =
  | {
      useSelection?: boolean;
      prompt: string;
      messages?: never;
    }
  | {
      useSelection?: never;
      prompt?: never;
      messages: Array<CoreMessage>;
    };
