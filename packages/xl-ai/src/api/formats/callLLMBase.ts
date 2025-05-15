import { BlockNoteEditor } from "@blocknote/core";
import { generateObject, streamObject } from "ai";
import {
  generateOperations,
  LLMRequestOptions,
  streamOperations,
} from "../../streamTool/callLLMWithStreamTools.js";
import { StreamTool } from "../../streamTool/streamTool.js";
import { isEmptyParagraph } from "../../util/emptyBlock.js";
import { CallLLMResult } from "./CallLLMResult.js";
import type { PromptBuilder } from "./PromptBuilder.js";

// TODO: comment
export const callLLMBase =
  (
    defaultPromptBuilder: PromptBuilder,
    getStreamTools: (
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
      onBlockUpdate?: (id: string) => void,
    ) => StreamTool<any>[],
  ) =>
  async (
    editor: BlockNoteEditor<any, any, any>,
    opts: Omit<LLMRequestOptions, "messages"> & {
      useSelection?: boolean;
      userPrompt: string;
      messagesBuilder?: PromptBuilder;
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
      onBlockUpdate?: (blockId: string) => void;
      onStart?: () => void;
      withDelays?: boolean;
      _generateObjectOptions?: Partial<
        Parameters<typeof generateObject<any>>[0]
      >;
      _streamObjectOptions?: Partial<Parameters<typeof streamObject<any>>[0]>;
    },
  ): Promise<CallLLMResult> => {
    const {
      userPrompt,
      useSelection,
      deleteEmptyCursorBlock,
      stream,
      onStart,
      withDelays,
      promptBuilder,
      ...rest
    } = {
      deleteEmptyCursorBlock: true,
      stream: true,
      withDelays: true,
      promptBuilder: defaultPromptBuilder,
      ...opts,
    };

    const cursorBlock = useSelection
      ? undefined
      : editor.getTextCursorPosition().block;

    const deleteCursorBlock: string | undefined =
      cursorBlock && deleteEmptyCursorBlock && isEmptyParagraph(cursorBlock)
        ? cursorBlock.id
        : undefined;

    const selectionInfo = useSelection
      ? editor.getSelectionCutBlocks()
      : undefined;

    const messages = await promptBuilder(editor, {
      selectedBlocks: selectionInfo?.blocks,
      userPrompt,
      excludeBlockIds: deleteCursorBlock ? [deleteCursorBlock] : undefined,
    });

    // console.log(messages);
    const streamTools = getStreamTools(
      editor,
      withDelays,
      opts.defaultStreamTools,
      selectionInfo
        ? { from: selectionInfo._meta.startPos, to: selectionInfo._meta.endPos }
        : undefined,
      opts.onBlockUpdate,
    );

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
        },
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
  };
