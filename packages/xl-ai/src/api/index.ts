import { BlockNoteEditor } from "@blocknote/core";
import { StreamTool } from "../streamTool/streamTool.js";
import { htmlBlockLLMFormat } from "./formats/html-blocks/htmlBlocks.js";
import { jsonLLMFormat } from "./formats/json/json.js";
import { markdownBlocksLLMFormat } from "./formats/markdown-blocks/markdownBlocks.js";
import { PromptBuilder } from "./formats/PromptBuilder.js";

export type LLMFormat = {
  /**
   * Function to get the stream tools that can apply HTML block updates to the editor
   */
  getStreamTools: (
    editor: BlockNoteEditor<any, any, any>,
    withDelays: boolean,
    defaultStreamTools?: {
      add?: boolean;
      update?: boolean;
      delete?: boolean;
    },
    selectionInfo?: {
      from: number;
      to: number;
    },
    onBlockUpdate?: (blockId: string) => void,
  ) => StreamTool<any>[];
  /**
   * The default PromptBuilder that determines how a userPrompt is converted to an array of
   * LLM Messages (CoreMessage[])
   */
  defaultPromptBuilder: PromptBuilder;
  /**
   * Helper functions which can be used when implementing a custom PromptBuilder.
   * The signature depends on the specific format
   */
  promptHelpers: any;
};

export const llmFormats = {
  _experimental_json: jsonLLMFormat,
  _experimental_markdown: markdownBlocksLLMFormat,
  html: htmlBlockLLMFormat,
};

export { doLLMRequest as callLLM } from "./LLMRequest.js";
export { promptHelpers } from "./promptHelpers/index.js";
