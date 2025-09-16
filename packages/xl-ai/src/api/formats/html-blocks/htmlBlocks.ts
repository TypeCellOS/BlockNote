import { BlockNoteEditor } from "@blocknote/core";
import { StreamTool } from "../../../streamTool/streamTool.js";

import { defaultHTMLPromptBuilder } from "./defaultHTMLPromptBuilder.js";
import {
  getDataForPromptNoSelection,
  getDataForPromptWithSelection,
} from "./htmlPromptData.js";
import { tools } from "./tools/index.js";

// Import the tool call types
import { AddBlocksToolCall } from "../base-tools/createAddBlocksTool.js";
import { UpdateBlockToolCall } from "../base-tools/createUpdateBlockTool.js";
import { DeleteBlockToolCall } from "../base-tools/delete.js";

// Define the tool types
export type AddTool = StreamTool<AddBlocksToolCall<string>>;
export type UpdateTool = StreamTool<UpdateBlockToolCall<string>>;
export type DeleteTool = StreamTool<DeleteBlockToolCall>;

// Create a conditional type that maps boolean flags to tool types
export type StreamToolsConfig = {
  add?: boolean;
  update?: boolean;
  delete?: boolean;
};

export type StreamToolsResult<T extends StreamToolsConfig> = [
  ...(T extends { update: true } ? [UpdateTool] : []),
  ...(T extends { add: true } ? [AddTool] : []),
  ...(T extends { delete: true } ? [DeleteTool] : []),
];

function getStreamTools<
  T extends StreamToolsConfig = { add: true; update: true; delete: true },
>(
  editor: BlockNoteEditor<any, any, any>,
  withDelays: boolean,
  defaultStreamTools?: T,
  selectionInfo?: {
    from: number;
    to: number;
  },
  onBlockUpdate?: (blockId: string) => void,
): StreamToolsResult<T> {
  const mergedStreamTools =
    defaultStreamTools ??
    ({
      add: true,
      update: true,
      delete: true,
    } as T);

  const streamTools: StreamTool<any>[] = [
    ...(mergedStreamTools.update
      ? [
          tools.update(editor, {
            idsSuffixed: true,
            withDelays,
            updateSelection: selectionInfo,
            onBlockUpdate,
          }),
        ]
      : []),
    ...(mergedStreamTools.add
      ? [tools.add(editor, { idsSuffixed: true, withDelays, onBlockUpdate })]
      : []),
    ...(mergedStreamTools.delete
      ? [tools.delete(editor, { idsSuffixed: true, withDelays, onBlockUpdate })]
      : []),
  ];

  return streamTools as StreamToolsResult<T>;
}

export const htmlBlockLLMFormat = {
  /**
   * Function to get the stream tools that can apply HTML block updates to the editor
   */
  getStreamToolsProvider: (
    opts: { withDelays?: boolean; defaultStreamTools?: StreamToolsConfig } = {},
  ) => ({
    getStreamTools: (
      editor: BlockNoteEditor<any, any, any>,
      selectionInfo?: { from: number; to: number },
      onBlockUpdate?: (blockId: string) => void,
    ) => {
      return getStreamTools(
        editor,
        opts.withDelays || true,
        opts.defaultStreamTools,
        selectionInfo,
        onBlockUpdate,
      );
    },
  }),

  /**
   * The default PromptBuilder that determines how a userPrompt is converted to an array of
   * LLM Messages (CoreMessage[])
   */
  defaultPromptBuilder: defaultHTMLPromptBuilder,

  defaultPromptInputDataBuilder: getDataForPromptNoSelection,

  /**
   * Helper functions which can be used when implementing a custom PromptBuilder
   */
  promptHelpers: {
    getDataForPromptNoSelection,
    getDataForPromptWithSelection,
  },
};
