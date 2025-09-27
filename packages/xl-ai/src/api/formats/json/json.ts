import { BlockNoteEditor } from "@blocknote/core";
import { StreamTool } from "../../../streamTool/streamTool.js";

import {
  defaultJSONPromptDataBuilder,
  getDataForPromptNoSelection,
  getDataForPromptWithSelection,
} from "./jsonPromptData.js";
import { tools } from "./tools/index.js";

// Import the tool call types
import { StreamToolsProvider } from "../../index.js";
import { defaultJSONPromptBuilder } from "./defaultJSONPromptBuilder.js";

import { StreamToolsConfig, StreamToolsResult } from "../index.js";

function getStreamTools<
  T extends StreamToolsConfig = { add: true; update: true; delete: true },
>(
  editor: BlockNoteEditor<any, any, any>,
  withDelays: boolean,
  defaultStreamTools?: T,
  selectionInfo?:
    | {
        from: number;
        to: number;
      }
    | boolean,
  onBlockUpdate?: (blockId: string) => void,
): StreamToolsResult<string, T> {
  if (typeof selectionInfo === "boolean") {
    const selection = selectionInfo
      ? editor.getSelectionCutBlocks()
      : undefined;

    selectionInfo = selection
      ? {
          from: selection._meta.startPos,
          to: selection._meta.endPos,
        }
      : undefined;
  }

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

  return streamTools as StreamToolsResult<string, T>;
}

export const jsonBlockLLMFormat = {
  /**
   * Function to get the stream tools that can apply JSON block updates to the editor
   */
  getStreamToolsProvider: <
    T extends StreamToolsConfig = { add: true; update: true; delete: true },
  >(
    opts: { withDelays?: boolean; defaultStreamTools?: T } = {},
  ): StreamToolsProvider<string, T> => ({
    getStreamTools: (editor, selectionInfo, onBlockUpdate) => {
      return getStreamTools(
        editor,
        opts.withDelays ?? true,
        opts.defaultStreamTools,
        selectionInfo,
        onBlockUpdate,
      );
    },
  }),

  tools,

  /**
   * The default PromptBuilder that determines how a userPrompt is converted to an array of
   * LLM Messages (CoreMessage[])
   */
  defaultPromptBuilder: defaultJSONPromptBuilder,

  /**
   * The default PromptInputDataBuilder that can take an editor and user request and convert it to the input required for the PromptBuilder
   */
  defaultPromptInputDataBuilder: defaultJSONPromptDataBuilder,

  /**
   * Helper functions which can be used when implementing a custom PromptBuilder
   */
  promptHelpers: {
    getDataForPromptNoSelection,
    getDataForPromptWithSelection,
  },
};
