import { BlockNoteEditor } from "@blocknote/core";
import { StreamTool } from "../../streamTool/streamTool.js";
import { AddBlocksToolCall } from "./base-tools/createAddBlocksTool.js";
import { UpdateBlockToolCall } from "./base-tools/createUpdateBlockTool.js";
import { DeleteBlockToolCall } from "./base-tools/delete.js";
import { htmlBlockLLMFormat } from "./html-blocks/htmlBlocks.js";
import { HTMLPromptData } from "./html-blocks/htmlPromptData.js";
import { jsonBlockLLMFormat } from "./json/json.js";
import { markdownBlockLLMFormat } from "./markdown-blocks/markdownBlocks.js";
import { PromptBuilder } from "./PromptBuilder.js";

// Define the tool types
export type AddTool<T> = StreamTool<AddBlocksToolCall<T>>;
export type UpdateTool<T> = StreamTool<UpdateBlockToolCall<T>>;
export type DeleteTool = StreamTool<DeleteBlockToolCall>;

// Create a conditional type that maps boolean flags to tool types
export type StreamToolsConfig = {
  add?: boolean;
  update?: boolean;
  delete?: boolean;
};

export type StreamToolsResult<TT, T extends StreamToolsConfig> = [
  ...(T extends { update: true } ? [UpdateTool<TT>] : []),
  ...(T extends { add: true } ? [AddTool<TT>] : []),
  ...(T extends { delete: true } ? [DeleteTool] : []),
];

export type StreamToolsProvider<
  TT,
  T extends StreamToolsConfig = { add: true; update: true; delete: true },
> = {
  getStreamTools: (
    editor: BlockNoteEditor<any, any, any>,
    selectionInfo?:
      | {
          from: number;
          to: number;
        }
      | boolean,
    onBlockUpdate?: (blockId: string) => void,
  ) => StreamToolsResult<TT, T>;
};

export type LLMFormat<TT> = {
  /**
   * Function to get the stream tools that can apply HTML block updates to the editor
   */
  getStreamToolsProvider: <T extends StreamToolsConfig>(
    withDelays: boolean,
    defaultStreamTools?: T,
  ) => StreamToolsProvider<TT, T>;
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

export * from "./PromptBuilder.js";
