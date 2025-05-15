import { BlockNoteEditor } from "@blocknote/core";
import { StreamTool } from "../../../streamTool/streamTool.js";
import { callLLMBase } from "../callLLMBase.js";

import { defaultHTMLPromptBuilder } from "./htmlBlocksPrompt.js";
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

export const callLLMHTMLBlocks = callLLMBase(
  defaultHTMLPromptBuilder,
  getStreamTools,
);
