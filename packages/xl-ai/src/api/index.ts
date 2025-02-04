import { CoreMessage } from "ai";
import { callLLM as callLLMJSON } from "./formats/json/json.js";
import { callLLM as callLLMMarkdown } from "./formats/markdown/markdown.js";

export const llm = {
  json: {
    call: callLLMJSON,
  },
  markdown: {
    call: callLLMMarkdown,
  },
};

// TODO: good practice like this?
export type PromptOrMessages =
  | {
      prompt: string;
      messages?: never;
    }
  | {
      prompt?: never;
      messages: Array<CoreMessage>;
    };
