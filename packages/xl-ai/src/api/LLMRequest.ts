import { BlockNoteEditor } from "@blocknote/core";
import { CoreMessage, generateObject, LanguageModelV1, streamObject } from "ai";
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
   *
   * (when invoking `callLLM` via the `AIExtension` this will default to the
   * model set in the `AIExtension` options)
   */
  model: LanguageModelV1;
  /**
   * The user prompt to use for the LLM call
   */
  userPrompt: string;
  /**
   * Previous response from the LLM, used for multi-step LLM calls
   *
   * (populated automatically when invoking `callLLM` via the `AIExtension` class)
   */
  previousResponse?: LLMResponse;
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
   * Additional options to pass to the AI SDK `generateObject` function
   * (only used when `stream` is `false`)
   */
  _generateObjectOptions?: Partial<Parameters<typeof generateObject<any>>[0]>;
  /**
   * Additional options to pass to the AI SDK `streamObject` function
   * (only used when `stream` is `true`)
   */
  _streamObjectOptions?: Partial<Parameters<typeof streamObject<any>>[0]>;
};

/**
 * Execute an LLM call
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
    previousResponse,
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
    cursorBlock &&
    deleteEmptyCursorBlock &&
    isEmptyParagraph(cursorBlock) &&
    editor.document.length > 1
      ? cursorBlock.id
      : undefined;

  const selectionInfo = useSelection
    ? editor.getSelectionCutBlocks()
    : undefined;

  let previousMessages: CoreMessage[] | undefined = undefined;

  if (previousResponse) {
    previousMessages = previousResponse.messages.map((m) => {
      // Some models, like Gemini and Anthropic don't support mixing system and user messages.
      // Therefore, we convert all user messages to system messages.
      // (also see comment below on a possibly better approach that might also address this)
      if (m.role === "user" && typeof m.content === "string") {
        return {
          role: "system",
          content: `USER_MESSAGE: ${m.content}`,
        };
      }
      return m;
    });
    /*
    We currently insert these messages as "assistant" string messages.
    When using Tools, the "official" pattern for this is to use a "tool_result" message.
    We might need to switch to this, but it would require more research whether:
    - we maybe should switch to streamText / generateText instead of streamObject / generateObject
      (this has built in access to `response.messages` on the AI SDK level)
    - but, we need to make research whether tool calls are always way to go. 
      generateObject / streamObject can also use structured outputs, and this
      might be yielding better results than tool calls.

    For now, this approach works ok.
    */
    previousMessages.push({
      role: "assistant",
      content:
        "These are the operations returned by a previous LLM call: \n" +
        JSON.stringify(
          await previousResponse.llmResult.getGeneratedOperations(),
        ),
    });
  }

  const messages = await promptBuilder(editor, {
    selectedBlocks: selectionInfo?.blocks,
    userPrompt,
    excludeBlockIds: deleteCursorBlock ? [deleteCursorBlock] : undefined,
    previousMessages,
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

  return new LLMResponse(messages, response, streamTools);
}
