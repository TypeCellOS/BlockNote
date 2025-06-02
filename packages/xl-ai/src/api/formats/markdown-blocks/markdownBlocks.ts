import { BlockNoteEditor } from "@blocknote/core";
import { StreamTool } from "../../../streamTool/streamTool.js";
import { defaultMarkdownPromptBuilder } from "./defaultMarkdownPromptBuilder.js";
import {
  getDataForPromptNoSelection,
  getDataForPromptWithSelection,
} from "./markdownPromptData.js";
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
          }),
        ]
      : []),
    ...(mergedStreamTools.add
      ? [tools.add(editor, { idsSuffixed: true, withDelays })]
      : []),
    ...(mergedStreamTools.delete
      ? [tools.delete(editor, { idsSuffixed: true, withDelays })]
      : []),
  ];

  return streamTools;
}

export const markdownBlocksLLMFormat = {
  /**
   * Function to get the stream tools that can apply BlockNote Markdown block updates to the editor
   */
  getStreamTools,
  /**
   * The default PromptBuilder that determines how a userPrompt is converted to an array of
   * LLM Messages (CoreMessage[])
   */
  defaultPromptBuilder: defaultMarkdownPromptBuilder,
  /**
   * Helper functions which can be used when implementing a custom PromptBuilder
   */
  promptHelpers: {
    getDataForPromptNoSelection,
    getDataForPromptWithSelection,
  },
};
