import {
  Block,
  BlockNoteEditor
} from "@blocknote/core";
import { generateObject, GenerateObjectResult, streamObject, StreamObjectResult } from "ai";
import {
  ApplyOperationResult
} from "../../executor/streamOperations/applyOperations.js";
import type { PromptOrMessages } from "../../index.js";
import { promptManipulateDocumentUseMarkdownBlocks, promptManipulateSelectionMarkdownBlocks } from "../../prompts/markdownBlocksPrompt.js";
import {
  generateOperations,
  LLMRequestOptions,
  streamOperations,
} from "../../streamTool/callLLMWithStreamTools.js";
import { StreamTool } from "../../streamTool/streamTool.js";
import { isEmptyParagraph } from "../../util/emptyBlock.js";
import {
  AsyncIterableStream,
  createAsyncIterableStreamFromAsyncIterable,
} from "../../util/stream.js";
import { applyMDOperations } from "./streamOperations/applyMDOperations.js";

import { getDataForPromptNoSelection, getDataForPromptWithSelection } from "./markdownPromptData.js";
import { tools } from "./tools/index.js";

// TODO: this file is a copy from htmlBlocks.ts, we should refactor to share code?

// Define the return type for streaming mode
type CallLLMReturnType = {
  toolCallsStream: AsyncIterableStream<ApplyOperationResult<any>>;
  llmResult: StreamObjectResult<any, any, any> | GenerateObjectResult<any>;
  apply: () => Promise<void>;
};

async function getMessages(editor: BlockNoteEditor<any, any, any>,
  opts: {
    selectedBlocks?: Block<any, any, any>[],
    excludeBlockIds?: string[]
} & PromptOrMessages) {
  // TODO: child blocks
  // TODO: document how to customize prompt
  if ("messages" in opts && opts.messages) {
    return opts.messages;
  } else if (opts.selectedBlocks) {
    if (opts.excludeBlockIds) {
      throw new Error("expected excludeBlockIds to be false when selectedBlocks is provided");
    }
    return promptManipulateSelectionMarkdownBlocks({
      ...await getDataForPromptWithSelection(editor, opts.selectedBlocks),
      userPrompt: opts.userPrompt,
    });
  } else {
    if (opts.useSelection) {
      throw new Error("expected useSelection to be false when selectedBlocks is not provided");
    }
    return promptManipulateDocumentUseMarkdownBlocks({
      ...await getDataForPromptNoSelection(editor, { excludeBlockIds: opts.excludeBlockIds }),
      userPrompt: opts.userPrompt,
    });
  } 
}

function getStreamTools(editor: BlockNoteEditor<any, any, any>, defaultStreamTools?: {
  /** Enable the add tool (default: true) */
  add?: boolean;
  /** Enable the update tool (default: true) */
  update?: boolean;
  /** Enable the delete tool (default: true) */
  delete?: boolean;
}) {
  const mergedStreamTools = {
    add: true,
    update: true,
    delete: true,
    ...defaultStreamTools,
  };

  const streamTools: StreamTool<any>[] = [
    ...(mergedStreamTools.update ? [tools.update(editor, { idsSuffixed: true})] : []),
    ...(mergedStreamTools.add ? [tools.add(editor, { idsSuffixed: true})] : []),
    ...(mergedStreamTools.delete ? [tools.delete(editor, { idsSuffixed: true})] : []),
  ];

  return streamTools;
}

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
      onStart?: () => void,
      _generateObjectOptions?: Partial<Parameters<typeof generateObject<any>>[0]>
      _streamObjectOptions?: Partial<Parameters<typeof streamObject<any>>[0]>
    }
): Promise<CallLLMReturnType> {
  const { userPrompt: prompt, useSelection,deleteEmptyCursorBlock, stream, onStart, ...rest } = opts;
  
  const cursorBlock = useSelection ? undefined : editor.getTextCursorPosition().block
  
  const deleteCursorBlock: string | undefined = cursorBlock && deleteEmptyCursorBlock && isEmptyParagraph(cursorBlock) ? cursorBlock.id : undefined;
  
  const selectionInfo = useSelection ? editor.getSelection2() : undefined;
  
  const messages = await getMessages(editor, { ...opts, selectedBlocks: selectionInfo?.blocks, excludeBlockIds: deleteCursorBlock ? [deleteCursorBlock] : undefined });
  
  const streamTools = getStreamTools(editor, opts.defaultStreamTools);

  let response: Awaited<ReturnType<typeof generateOperations<any>>> | Awaited<ReturnType<typeof streamOperations<any>>>;

  if (stream || stream === undefined) {
    response = await streamOperations(streamTools, {
      messages, ...rest
    }, () => {
    if (deleteCursorBlock) {
      editor.removeBlocks([deleteCursorBlock]);
    }
    onStart?.();
  });
  } else {
    response = await generateOperations(streamTools, {
      messages, ...rest
    });
    if (deleteCursorBlock) {
      editor.removeBlocks([deleteCursorBlock]);
    }
    onStart?.();
  }

  const results = applyMDOperations(editor, response.operationsSource, selectionInfo?._meta.startPos, selectionInfo?._meta.endPos);

  const toolCallsStream =
    createAsyncIterableStreamFromAsyncIterable(results);

  return {
    llmResult: response.result,
    toolCallsStream,
    // TODO: make it easy to add your own "applyOperations" function
    async apply() {
      /* eslint-disable-next-line */
      for await (const _result of toolCallsStream) {
        // no op
      }
    },
  };
}
