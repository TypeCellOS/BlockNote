import { ChatTransport, UIMessage } from "ai";
import { MessageSender } from "../AIExtension.js";
import type { PromptBuilder } from "./formats/PromptBuilder.js";
import { HTMLPromptData } from "./formats/html-blocks/htmlPromptData.js";
import { StreamToolsProvider } from "./index.js";

type MakeOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// export type ExecuteLLMRequestOptions = {
//   messages: UIMessage[];
//   streamTools: StreamTool<any>[];
//   // TODO: needed?
//   llmRequestOptions: MakeOptional<LLMRequestOptions, "executor">;
//   onStart?: () => void;
// };

export type LLMRequestHelpers = {
  /**
   * Customize how your LLM backend is called.
   * Implement this function if you want to call a backend that is not compatible with
   * the Vercel AI SDK
   */
  transport?: ChatTransport<UIMessage>;

  streamToolsProvider?: StreamToolsProvider;
} & (
  | {
      /**
       * The `PromptBuilder` to use for the LLM call
       *
       * (A PromptBuilder is a function that takes a BlockNoteEditor and details about the user's prompt
       * and turns it into an AI SDK `CoreMessage` array to be passed to the LLM)
       *
       * @default provided by the format (e.g. `llm.html.defaultPromptBuilder`)
       */
      promptBuilder?: PromptBuilder<HTMLPromptData>;

      messageSender?: never;
    }
  | {
      // messageSender variant
      promptBuilder?: never;
      messageSender?: MessageSender;
    }
);

export type LLMRequestOptions = {
  /**
   * The user prompt to use for the LLM call
   */
  userPrompt: string;

  /**
   * Whether to use the editor selection for the LLM call
   *
   * @default true
   */
  useSelection?: boolean;
  /**
   * If the user's cursor is in an empty paragraph, automatically delete it when the AI
   * is starting to write.
   *
   * (This is used when a user starts typing `/ai` in an empty block)
   *
   * @default true
   */
  deleteEmptyCursorBlock?: boolean;
} & LLMRequestHelpers;
