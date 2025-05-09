import { Block, BlockNoteEditor } from "@blocknote/core";
import { StreamTool } from "../../../streamTool/streamTool.js";
import type { PromptOrMessages } from "../../index.js";
import {
  promptManipulateDocumentUseHTMLBlocks,
  promptManipulateSelectionHTMLBlocks,
} from "../../prompts/htmlBlocksPrompt.js";
import { callLLMBase } from "../callLLMBase.js";
import {
  getDataForPromptNoSelection,
  getDataForPromptWithSelection,
} from "./htmlPromptData.js";
import { tools } from "./tools/index.js";

async function getMessages(
  editor: BlockNoteEditor<any, any, any>,
  opts: {
    selectedBlocks?: Block<any, any, any>[];
    excludeBlockIds?: string[];
  } & PromptOrMessages
) {
  // TODO: child blocks
  // TODO: document how to customize prompt
  if ("messages" in opts && opts.messages) {
    return opts.messages;
  } else if (opts.selectedBlocks) {
    if (opts.excludeBlockIds) {
      throw new Error(
        "expected excludeBlockIds to be false when selectedBlocks is provided"
      );
    }

    return promptManipulateSelectionHTMLBlocks({
      ...(await getDataForPromptWithSelection(editor, opts.selectedBlocks)),
      userPrompt: opts.userPrompt,
    });
  } else {
    if (opts.useSelection) {
      throw new Error(
        "expected useSelection to be false when selectedBlocks is not provided"
      );
    }
    return promptManipulateDocumentUseHTMLBlocks({
      ...(await getDataForPromptNoSelection(editor, {
        excludeBlockIds: opts.excludeBlockIds,
      })),
      userPrompt: opts.userPrompt,
    });
  }
}

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
  onBlockUpdate?: (blockId: string) => void
) {
  const mergedStreamTools = {
    add: true,
    update: true,
    delete: true,
    ...defaultStreamTools,
  };

  const streamTools: StreamTool<any>[] = [
    ...(mergedStreamTools.update
      ? [tools.update(editor, { idsSuffixed: true, withDelays, updateSelection: selectionInfo, onBlockUpdate })]
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

export const callLLMHTMLBlocks = callLLMBase(getMessages, getStreamTools);
