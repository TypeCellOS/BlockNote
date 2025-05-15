import { htmlBlockLLMFormat } from "./formats/html-blocks/htmlBlocks.js";
import { jsonLLMFormat } from "./formats/json/json.js";
import { markdownBlocksLLMFormat } from "./formats/markdown-blocks/markdownBlocks.js";

export const llm = {
  _experimental_json: jsonLLMFormat,
  _experimental_markdown: markdownBlocksLLMFormat,
  html: htmlBlockLLMFormat,
};
