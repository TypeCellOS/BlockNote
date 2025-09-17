import { BlockNoteEditor } from "@blocknote/core";
import { StreamTool } from "../streamTool/streamTool.js";
import { htmlBlockLLMFormat } from "./formats/html-blocks/htmlBlocks.js";
import { HTMLPromptData } from "./formats/html-blocks/htmlPromptData.js";
import { jsonBlockLLMFormat } from "./formats/json/json.js";
import { markdownBlockLLMFormat } from "./formats/markdown-blocks/markdownBlocks.js";
import { PromptBuilder } from "./formats/PromptBuilder.js";

export type StreamToolsProvider = {
  getStreamTools: (
    editor: BlockNoteEditor<any, any, any>,
    selectionInfo?:
      | {
          from: number;
          to: number;
        }
      | boolean,
    onBlockUpdate?: (blockId: string) => void,
  ) => StreamTool<any>[];
};
export type LLMFormat = {
  /**
   * Function to get the stream tools that can apply HTML block updates to the editor
   */
  getStreamToolsProvider: (
    withDelays: boolean,
    defaultStreamTools?: {
      add?: boolean;
      update?: boolean;
      delete?: boolean;
    },
  ) => StreamToolsProvider;
  /**
   * The default PromptBuilder that determines how a userPrompt is converted to an array of
   * LLM Messages (CoreMessage[])
   */
  defaultPromptBuilder: PromptBuilder<HTMLPromptData>;
  /**
   * Helper functions which can be used when implementing a custom PromptBuilder.
   * The signature depends on the specific format
   */
  promptHelpers: any;
};

export const llmFormats = {
  _experimental_json: jsonBlockLLMFormat,
  _experimental_markdown: markdownBlockLLMFormat,
  html: htmlBlockLLMFormat,
};

// export { doLLMRequest as callLLM } from "./LLMRequest.js";
// export { LLMResponse } from "./LLMResponse.js";
export { promptHelpers } from "./promptHelpers/index.js";
