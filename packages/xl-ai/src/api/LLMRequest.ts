import { BlockNoteEditor } from "@blocknote/core";
import { CoreMessage } from "ai";
import { StreamTool } from "../streamTool/streamTool.js";
import { isEmptyParagraph } from "../util/emptyBlock.js";
import { LLMResponse } from "./LLMResponse.js";
import type { PromptBuilder } from "./formats/PromptBuilder.js";
import { htmlBlockLLMFormat } from "./formats/html-blocks/htmlBlocks.js";
import { LLMFormat } from "./index.js";
import { trimEmptyBlocks } from "./promptHelpers/trimEmptyBlocks.js";

type MakeOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type ExecuteLLMRequestOptions = {
  messages: CoreMessage[];
  streamTools: StreamTool<any>[];
  // TODO: needed?
  llmRequestOptions: MakeOptional<LLMRequestOptions, "executor">;
  onStart?: () => void;
};

export type LLMRequestOptions = {
  /**
   * Customize how your LLM backend is called.
   * Implement this function if you want to call a backend that is not compatible with
   * the Vercel AI SDK
   */
  executor: (opts: ExecuteLLMRequestOptions) => Promise<LLMResponse>;

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
    /** Enable the add tool (default: false) */
    add?: boolean;
    /** Enable the update tool (default: false) */
    update?: boolean;
    /** Enable the delete tool (default: false) */
    delete?: boolean;
  };
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
    onStart,
    withDelays,
    dataFormat,
    previousResponse,
    ...rest
  } = {
    deleteEmptyCursorBlock: true,
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
    trimEmptyBlocks(editor.document).length > 0
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
    // TODO: fix
    // previousMessages.push({
    //   role: "system", // using "assistant" here doesn't work with gemini because we can't mix system / assistant messages
    //   content:
    //     "ASSISTANT_MESSAGE: These are the operations returned by a previous LLM call: \n" +
    //     JSON.stringify(
    //       await previousResponse.llmResult.getGeneratedOperations(),
    //     ),
    // });
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

  // TODO: design decision, does it make sense to pass `messages` here, or should creating the message array
  // be the responsibility of the executor / server, and should we pass editor state instead?
  return opts.executor({
    onStart: () => {
      if (deleteCursorBlock) {
        editor.removeBlocks([deleteCursorBlock]);
      }
      onStart?.();
    },
    messages,
    streamTools,
    llmRequestOptions: {
      ...opts,
      ...rest,
    },
  });
}
