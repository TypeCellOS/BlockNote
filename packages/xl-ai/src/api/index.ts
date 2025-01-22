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
