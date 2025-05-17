import { BlockNoteEditor } from "@blocknote/core";
import { generateObject, LanguageModelV1, streamObject } from "ai";
import {
  generateOperations,
  streamOperations,
} from "../streamTool/callLLMWithStreamTools.js";
import { isEmptyParagraph } from "../util/emptyBlock.js";
import { LLMResponse } from "./LLMResponse.js";
import type { PromptBuilder } from "./formats/PromptBuilder.js";
import { htmlBlockLLMFormat } from "./formats/html-blocks/htmlBlocks.js";
import { LLMFormat } from "./index.js";

export type LLMRequestOptions = {
  /**
   * The language model to use for the LLM call (AI SDK)
   */
  model: LanguageModelV1;
  /**
   * The user prompt to use for the LLM call
   */
  userPrompt: string;
  /**
   * The default data format to use for LLM calls
   * "html" is recommended, the other formats are experimental
   * @default html format (`llm.html`)
   */
  dataFormat?: LLMFormat;
  /**
   * The `PromptBuilder` to use for the LLM call
   *
   * (A PromptBuilder is a function that takes a BlockNoteEditor and details about the user's prompt
   * and turns it into an AI SDK `CoreMessage` array to be passed to the LLM)
   *
   * @default provided by the format (e.g. `llm.html.defaultPromptBuilder`)
   */
  promptBuilder?: PromptBuilder;
  /**
   * The maximum number of retries for the LLM call
   *
   * @default 2
   */
  maxRetries?: number;
  /**
   * Whether to use the editor selection for the LLM call
   *
   * @default true
   */
  useSelection?: boolean;
  /**
   * Defines whether the LLM can add, update, or delete blocks
   *
   * @default { add: true, update: true, delete: true }
   */
  defaultStreamTools?: {
    /** Enable the add tool (default: true) */
    add?: boolean;
    /** Enable the update tool (default: true) */
    update?: boolean;
    /** Enable the delete tool (default: true) */
    delete?: boolean;
  };
  /**
   * Whether to stream the LLM response or not
   *
   * When streaming, we use the AI SDK `streamObject` function,
   * otherwise, we use the AI SDK `generateObject` function.
   *
   * @default true
   */
  stream?: boolean;
  /**
   * If the user's cursor is in an empty paragraph, automatically delete it when the AI
   * is starting to write.
   *
   * (This is used when a user starts typing `/ai` in an empty block)
   *
   * @default true
   */
  deleteEmptyCursorBlock?: boolean;
  /**
   * Callback when a specific block is updated by the LLM
   *
   * (used by `AIExtension` to update the `AIMenu` position)
   */
  onBlockUpdate?: (blockId: string) => void;
  /**
   * Callback when the AI Agent starts writing
   */
  onStart?: () => void;
  /**
   * Whether to add delays between text update operations, to make the AI simulate a human typing
   *
   * @default true
   */
  withDelays?: boolean;
  /**
   * Additional options to pass to the `generateObject` function
   * (only used when `stream` is `false`)
   */
  _generateObjectOptions?: Partial<Parameters<typeof generateObject<any>>[0]>;
  /**
   * Additional options to pass to the `streamObject` function
   * (only used when `stream` is `true`)
   */
  _streamObjectOptions?: Partial<Parameters<typeof streamObject<any>>[0]>;
};

/**
 * Execute an LLM call and apply the result to the editor
 *
 * @param editor - The BlockNoteEditor the LLM should operate on
 * @param opts - The options for the LLM call (@link {CallLLMOptions})
 * @returns A `LLMResponse` object containing the LLM response which can be applied to the editor
 */
export async function doLLMRequest(
  editor: BlockNoteEditor<any, any, any>,
  opts: LLMRequestOptions,
): Promise<LLMResponse> {
  const {
    userPrompt,
    useSelection,
    deleteEmptyCursorBlock,
    stream,
    onStart,
    withDelays,
    dataFormat,
    ...rest
  } = {
    maxRetries: 2,
    deleteEmptyCursorBlock: true,
    stream: true,
    withDelays: true,
    dataFormat: htmlBlockLLMFormat,
    ...opts,
  };

  const promptBuilder = opts.promptBuilder ?? dataFormat.defaultPromptBuilder;
  const getStreamTools = dataFormat.getStreamTools;

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

  return new LLMResponse(response, streamTools);
}
