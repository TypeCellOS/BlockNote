import {
  BlockNoteEditor,
  BlockNoteExtension,
  UnreachableCaseError,
} from "@blocknote/core";
import {
  applySuggestions,
  revertSuggestions,
  suggestChanges,
} from "@blocknote/prosemirror-suggest-changes";
import { APICallError, LanguageModel, RetryError } from "ai";
import { Plugin, PluginKey } from "prosemirror-state";
import { fixTablesKey } from "prosemirror-tables";
import { createStore, StoreApi } from "zustand/vanilla";
import { doLLMRequest, LLMRequestOptions } from "./api/LLMRequest.js";
import { LLMResponse } from "./api/LLMResponse.js";
import { PromptBuilder } from "./api/formats/PromptBuilder.js";
import { LLMFormat, llmFormats } from "./api/index.js";
import { createAgentCursorPlugin } from "./plugins/AgentCursorPlugin.js";

type MakeOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

type ReadonlyStoreApi<T> = Pick<
  StoreApi<T>,
  "getState" | "getInitialState" | "subscribe"
>;

type AIPluginState = {
  // zustand design considerations:
  //  - moved this to a nested object to have better typescript typing
  //  - if we'd do this without a nested object, then we could easily set "wrong" values,
  //    because "setState" takes a partial object (unless the second parameter "replace" = true),
  //    and thus we'd lose typescript's typing help

  aiMenuState:
    | ({
        /**
         * The ID of the block that the AI menu is opened at.
         * This changes as the AI is making changes to the document
         */
        blockId: string;
      } & (
        | {
            status: "error";
            error: any;
          }
        | {
            status: "user-input" | "thinking" | "ai-writing" | "user-reviewing";
          }
      ))
    | "closed";

  /**
   * The previous response from the LLM, used for multi-step LLM calls
   */
  llmResponse?: LLMResponse;
};

/**
 * configuration options for LLM calls that are shared across all calls by default
 */
type GlobalLLMRequestOptions = {
  /**
   * The default language model to use for LLM calls
   */
  model: LanguageModel;
  /**
   * Whether to stream the LLM response
   * @default true
   */
  stream?: boolean;
  /**
   * The default data format to use for LLM calls
   * html format is recommended, the other formats are experimental
   * @default llmFormats.html
   */
  dataFormat?: LLMFormat;
  /**
   * A function that can be used to customize the prompt sent to the LLM
   * @default the default prompt builder for the selected {@link dataFormat}
   */
  promptBuilder?: PromptBuilder;
};

const PLUGIN_KEY = new PluginKey(`blocknote-ai-plugin`);

export class AIExtension extends BlockNoteExtension {
  private previousRequestOptions: LLMRequestOptions | undefined;

  public static name(): string {
    return "ai";
  }

  // internal store including setters
  private readonly _store = createStore<AIPluginState>()((_set) => ({
    aiMenuState: "closed",
  }));

  /**
   * Returns a read-only zustand store with the state of the AI Extension
   */
  public get store() {
    // externally, don't expose setters (if we want to do so, expose `set` methods seperately)
    return this._store as ReadonlyStoreApi<AIPluginState>;
  }

  /**
   * Returns a zustand store with the global configuration of the AI Extension.
   * These options are used by default across all LLM calls when calling {@link doLLMRequest}
   */
  public readonly options: ReturnType<
    ReturnType<
      typeof createStore<
        MakeOptional<Required<GlobalLLMRequestOptions>, "promptBuilder">
      >
    >
  >;

  /**
   * @internal use `createAIExtension` instead
   */
  constructor(
    public readonly editor: BlockNoteEditor<any, any, any>,
    options: GlobalLLMRequestOptions & {
      /**
       * The name and color of the agent cursor
       *
       * @default { name: "AI", color: "#8bc6ff" }
       */
      agentCursor?: { name: string; color: string };
    },
  ) {
    super();

    this.options = createStore<
      MakeOptional<Required<GlobalLLMRequestOptions>, "promptBuilder">
    >()((_set) => ({
      dataFormat: llmFormats.html,
      stream: true,
      ...options,
    }));

    this.addProsemirrorPlugin(
      new Plugin({
        key: PLUGIN_KEY,
        filterTransaction: (tr) => {
          const menuState = this.store.getState().aiMenuState;

          if (menuState !== "closed" && menuState.status === "ai-writing") {
            if (tr.getMeta(fixTablesKey)?.fixTables) {
              // the fixtables plugin causes the steps between of the AI Agent to become invalid
              // so we need to prevent it from running
              // (we might need to filter out other / or maybe any transactions during the writing phase)
              return false;
            }
          }
          return true;
        },
      }),
    );
    this.addProsemirrorPlugin(suggestChanges());
    this.addProsemirrorPlugin(
      createAgentCursorPlugin(
        options.agentCursor || { name: "AI", color: "#8bc6ff" },
      ),
    );
  }

  /**
   * Open the AI menu at a specific block
   */
  public openAIMenuAtBlock(blockID: string) {
    this.editor.setForceSelectionVisible(true);
    this.editor.isEditable = false;
    this._store.setState({
      aiMenuState: {
        blockId: blockID,
        status: "user-input",
      },
    });
  }

  /**
   * Close the AI menu
   */
  public closeAIMenu() {
    this.previousRequestOptions = undefined;
    this._store.setState({
      aiMenuState: "closed",
      llmResponse: undefined,
    });
    this.editor.setForceSelectionVisible(false);
    this.editor.isEditable = true;
    this.editor.focus();
  }

  /**
   * Accept the changes made by the LLM
   */
  public acceptChanges() {
    this.editor.exec(applySuggestions);
    this.closeAIMenu();
  }

  /**
   * Reject the changes made by the LLM
   */
  public rejectChanges() {
    this.editor.exec(revertSuggestions);
    this.closeAIMenu();
  }

  /**
   * Retry the previous LLM call.
   *
   * Only valid if the current status is "error"
   */
  public async retry() {
    const state = this.store.getState().aiMenuState;
    if (
      state === "closed" ||
      state.status !== "error" ||
      !this.previousRequestOptions
    ) {
      throw new Error("retry() is only valid when a previous response failed");
    }
    if (
      state.error instanceof APICallError ||
      state.error instanceof RetryError
    ) {
      // retry the previous call as-is, as there was a network error
      return this.callLLM(this.previousRequestOptions);
    } else {
      // an error occurred while parsing / executing the previous LLM call
      // give the LLM a chance to fix the error
      // (Possible improvement: maybe this should be a system prompt instead of the userPrompt)
      const errorMessage =
        state.error instanceof Error
          ? state.error.message
          : String(state.error);

      return this.callLLM({
        userPrompt: `An error occured: ${errorMessage}
            Please retry the previous user request.`,
      });
    }
  }

  /**
   * Update the status of a call to an LLM
   *
   * @warning This method should usually only be used for advanced use-cases
   * if you want to implement how an LLM call is executed. Usually, you should
   * use {@link doLLMRequest} instead which will handle the status updates for you.
   */
  public setAIResponseStatus(
    status:
      | "user-input"
      | "thinking"
      | "ai-writing"
      | "user-reviewing"
      | {
          status: "error";
          error: any;
        },
  ) {
    const aiMenuState = this.store.getState().aiMenuState;
    if (aiMenuState === "closed") {
      return; // TODO: log error?
    }

    if (status === "ai-writing") {
      this.editor.setForceSelectionVisible(false);
    }

    if (typeof status === "object") {
      if (status.status !== "error") {
        throw new UnreachableCaseError(status.status);
      }
      this._store.setState({
        aiMenuState: {
          status: status.status,
          error: status.error,
          blockId: aiMenuState.blockId,
        },
      });
    } else {
      this._store.setState({
        aiMenuState: {
          status: status,
          blockId: aiMenuState.blockId,
        },
      });
    }
  }

  /**
   * Execute a call to an LLM and apply the result to the editor
   */
  public async callLLM(opts: MakeOptional<LLMRequestOptions, "model">) {
    this.setAIResponseStatus("thinking");
    let ret: LLMResponse | undefined;
    try {
      const requestOptions = {
        ...this.options.getState(),
        ...opts,
        previousResponse: this.store.getState().llmResponse,
      };
      this.previousRequestOptions = requestOptions;

      ret = await doLLMRequest(this.editor, {
        ...requestOptions,
        onStart: () => {
          this.setAIResponseStatus("ai-writing");
          opts.onStart?.();
        },
        onBlockUpdate: (blockId: string) => {
          // NOTE: does this setState with an anon object trigger unnecessary re-renders?
          this._store.setState({
            aiMenuState: {
              blockId,
              status: "ai-writing",
            },
          });
          opts.onBlockUpdate?.(blockId);
        },
      });

      this._store.setState({
        llmResponse: ret,
      });

      await ret.execute();

      this.setAIResponseStatus("user-reviewing");
    } catch (e) {
      this.setAIResponseStatus({
        status: "error",
        error: e,
      });
      // eslint-disable-next-line no-console
      console.warn("Error calling LLM", e);
    }
    return ret;
  }
}

/**
 * Create a new AIExtension instance, this can be passed to the BlockNote editor via the `extensions` option
 */
export function createAIExtension(
  options: ConstructorParameters<typeof AIExtension>[1],
) {
  return (editor: BlockNoteEditor<any, any, any>) => {
    return new AIExtension(editor, options);
  };
}

/**
 * Return the AIExtension instance from the editor
 */
export function getAIExtension(editor: BlockNoteEditor<any, any, any>) {
  return editor.extension(AIExtension);
}
