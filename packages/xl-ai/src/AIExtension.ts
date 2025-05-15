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
import { CoreMessage, LanguageModel } from "ai";
import { Plugin, PluginKey } from "prosemirror-state";
import { fixTablesKey } from "prosemirror-tables";
import { createStore, StoreApi } from "zustand/vanilla";
import { CallLLMResult } from "./api/formats/CallLLMResult.js";
import { PromptBuilderInput } from "./api/formats/PromptBuilder.js";
import { llm } from "./api/index.js";
import { createAgentCursorPlugin } from "./plugins/AgentCursorPlugin.js";

type MakeOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

type ReadonlyStoreApi<T> = Pick<
  StoreApi<T>,
  "getState" | "getInitialState" | "subscribe"
>;

type AIPluginState = {
  /**
   * zustand design considerations:
   * - moved this to a nested object to have better typescript typing
   * - if we'd do this without a nested object, then we could easily set "wrong" values,
   *   because "setState" takes a partial object (unless the second parameter "replace" = true),
   *   and thus we'd lose typescript's typing help
   *
   */
  aiMenuState:
    | {
        blockId: string;
        status:
          | "user-input"
          | "thinking"
          | "ai-writing"
          | "error"
          | "user-reviewing";
      }
    | "closed";
};

/**
 * configuration options for LLM calls that are shared across all calls by default
 */
type GlobalLLMCallOptions = {
  /**
   * The default language model to use for LLM calls
   */
  model: LanguageModel;
  /**
   * The default data format to use for LLM calls
   * "html" is recommended, the other formats are experimental
   * @default html
   */
  dataFormat?: "html" | "json" | "markdown";
  /**
   * Whether to stream the LLM response
   * @default true
   */
  stream?: boolean;

  promptBuilder?: (
    editor: BlockNoteEditor<any, any, any>,
    opts: PromptBuilderInput,
  ) => Promise<Array<CoreMessage>>;
};

// parameters that are specific to each call
type CallSpecificCallLLMOptions = Partial<GlobalLLMCallOptions> & {
  userPrompt: string;
  useSelection?: boolean;
  defaultStreamTools?: {
    /** Enable the add tool (default: true) */
    add?: boolean;
    /** Enable the update tool (default: true) */
    update?: boolean;
    /** Enable the delete tool (default: true) */
    delete?: boolean;
  };
  maxRetries?: number;
};

const PLUGIN_KEY = new PluginKey(`blocknote-ai-plugin`);

export class AIExtension extends BlockNoteExtension {
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
   * Returns a zustand store with the configuration of the AI Extension.
   * These options are used across all LLM calls by default when calling {@link callLLM}
   */
  public readonly options: ReturnType<
    ReturnType<
      typeof createStore<
        MakeOptional<Required<GlobalLLMCallOptions>, "promptBuilder">
      >
    >
  >;

  /**
   * @internal use `createAIExtension` instead
   */
  constructor(
    public readonly editor: BlockNoteEditor<any, any, any>,
    options: GlobalLLMCallOptions & {
      /**
       * The name and color of the agent cursor (optional)
       */
      agentCursor?: { name: string; color: string };
    },
  ) {
    super();

    this.options = createStore<
      MakeOptional<Required<GlobalLLMCallOptions>, "promptBuilder">
    >()((_set) => ({
      dataFormat: "html",
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
    this.addProsemirrorPlugin(createAgentCursorPlugin(options.agentCursor));
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
    this._store.setState({
      aiMenuState: "closed",
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
   * Update the status of a call to an LLM
   *
   * @warning This method should usually only be used for advanced use-cases
   * if you want to implement how an LLM call is executed. Usually, you should
   * use {@link callLLM} instead.
   */
  public setAIResponseStatus(
    status:
      | "user-input"
      | "thinking"
      | "ai-writing"
      | "error"
      | "user-reviewing",
  ) {
    const aiMenuState = this.store.getState().aiMenuState;
    if (aiMenuState === "closed") {
      return; // TODO: log error?
    }

    if (status === "ai-writing") {
      this.editor.setForceSelectionVisible(false);
    }

    this._store.setState({
      aiMenuState: {
        status: status,
        blockId: aiMenuState.blockId,
      },
    });
  }

  /**
   * Execute a call to an LLM and apply the result to the editor
   */
  public async callLLM(opts: CallSpecificCallLLMOptions) {
    this.setAIResponseStatus("thinking");

    try {
      let ret: CallLLMResult;

      const options = {
        ...this.options.getState(),
        ...opts,
        onStart: () => {
          this.setAIResponseStatus("ai-writing");
        },
        onBlockUpdate: (blockId: string) => {
          // NOTE: does this setState with an anon object trigger unnecessary re-renders?
          this._store.setState({
            aiMenuState: {
              blockId,
              status: "ai-writing",
            },
          });
        },
      };
      if (options.dataFormat === "json") {
        ret = await llm._experimental_json.call(this.editor, options);
      } else if (options.dataFormat === "markdown") {
        ret = await llm._experimental_markdown.call(this.editor, options);
      } else if (options.dataFormat === "html") {
        ret = await llm.html.call(this.editor, options);
      } else {
        throw new UnreachableCaseError(options.dataFormat);
      }

      await ret.execute();

      this.setAIResponseStatus("user-reviewing");
    } catch (e) {
      this.setAIResponseStatus("error");
      // eslint-disable-next-line no-console
      console.warn("Error calling LLM", e);
    }
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
