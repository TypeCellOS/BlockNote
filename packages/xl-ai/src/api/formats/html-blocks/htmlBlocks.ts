import { BlockNoteEditor } from "@blocknote/core";
import { StreamTool } from "../../../streamTool/streamTool.js";

import { defaultHTMLPromptBuilder } from "./defaultHTMLPromptBuilder.js";
import {
  getDataForPromptNoSelection,
  getDataForPromptWithSelection,
} from "./htmlPromptData.js";
import { tools } from "./tools/index.js";

function getStreamTools(
  editor: BlockNoteEditor<any, any, any>,
  withDelays: boolean,
  defaultStreamTools?: {
    /** Enable the add tool (default: true) */
    add?: boolean;
    /** Enable the update tool (default: true) */
    update?: boolean;
    /** Enable the delete tool (default: true) */
    delete?: boolean;
  },
  selectionInfo?: {
    from: number;
    to: number;
  },
  onBlockUpdate?: (blockId: string) => void,
) {
  const mergedStreamTools = {
    add: true,
    update: true,
    delete: true,
    ...defaultStreamTools,
  };

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

  return streamTools;
}

export const htmlBlockLLMFormat = {
  /**
   * Function to get the stream tools that can apply HTML block updates to the editor
   */
  getStreamTools,
  /**
   * The default PromptBuilder that determines how a userPrompt is converted to an array of
   * LLM Messages (CoreMessage[])
   */
  defaultPromptBuilder: defaultHTMLPromptBuilder,
  /**
   * Helper functions which can be used when implementing a custom PromptBuilder
   */
  promptHelpers: {
    getDataForPromptNoSelection,
    getDataForPromptWithSelection,
  },
};
