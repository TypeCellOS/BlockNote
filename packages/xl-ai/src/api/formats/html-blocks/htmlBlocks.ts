import { Block, BlockNoteEditor } from "@blocknote/core";
import { generateObject, streamObject } from "ai";
import type { PromptOrMessages } from "../../index.js";
import {
  promptManipulateDocumentUseHTMLBlocks,
  promptManipulateSelectionHTMLBlocks,
} from "../../prompts/htmlBlocksPrompt.js";
import {
  generateOperations,
  LLMRequestOptions,
  streamOperations,
} from "../../streamTool/callLLMWithStreamTools.js";
import { StreamTool } from "../../streamTool/streamTool.js";
import { isEmptyParagraph } from "../../util/emptyBlock.js";
import { CallLLMResult } from "../CallLLMResult.js";
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
  }
) {
  const mergedStreamTools = {
    add: true,
    update: true,
    delete: true,
    ...defaultStreamTools,
  };

  const streamTools: StreamTool<any>[] = [
    ...(mergedStreamTools.update
      ? [tools.update(editor, { idsSuffixed: true, withDelays, updateSelection: selectionInfo })]
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

// TODO: what to expose as api?
export async function callLLM(
  editor: BlockNoteEditor<any, any, any>,
  opts: Omit<LLMRequestOptions, "messages"> &
    PromptOrMessages & {
      defaultStreamTools?: {
        /** Enable the add tool (default: true) */
        add?: boolean;
        /** Enable the update tool (default: true) */
        update?: boolean;
        /** Enable the delete tool (default: true) */
        delete?: boolean;
      };
      stream?: boolean;
      deleteEmptyCursorBlock?: boolean;
      onStart?: () => void;
      withDelays?: boolean;
      _generateObjectOptions?: Partial<
        Parameters<typeof generateObject<any>>[0]
      >;
      _streamObjectOptions?: Partial<Parameters<typeof streamObject<any>>[0]>;
    }
): Promise<CallLLMResult> {
  const {
    userPrompt: prompt,
    useSelection,
    deleteEmptyCursorBlock,
    stream,
    onStart,
    withDelays,
    ...rest
  } = {
    deleteEmptyCursorBlock: true,
    stream: true,
    withDelays: true,
    ...opts,
  };

  const cursorBlock = useSelection
    ? undefined
    : editor.getTextCursorPosition().block;

  const deleteCursorBlock: string | undefined =
    cursorBlock && deleteEmptyCursorBlock && isEmptyParagraph(cursorBlock)
      ? cursorBlock.id
      : undefined;

  const selectionInfo = useSelection ? editor.getSelection2() : undefined;

  const messages = await getMessages(editor, {
    ...opts,
    selectedBlocks: selectionInfo?.blocks,
    excludeBlockIds: deleteCursorBlock ? [deleteCursorBlock] : undefined,
  });

  const streamTools = getStreamTools(editor, withDelays,opts.defaultStreamTools, selectionInfo ? {from: selectionInfo._meta.startPos, to: selectionInfo._meta.endPos} : undefined);

  let response:
    | Awaited<ReturnType<typeof generateOperations<any>>>
    | Awaited<ReturnType<typeof streamOperations<any>>>;

  if (stream) {
    response = await streamOperations(
      streamTools,
      {
        messages,
        ...rest,
      },
      () => {
        if (deleteCursorBlock) {
          editor.removeBlocks([deleteCursorBlock]);
        }
        onStart?.();
      }
    );
  } else {
    response = await generateOperations(streamTools, {
      messages,
      ...rest,
    });
    if (deleteCursorBlock) {
      editor.removeBlocks([deleteCursorBlock]);
    }
    onStart?.();
  }

return new CallLLMResult(response, streamTools);
}
