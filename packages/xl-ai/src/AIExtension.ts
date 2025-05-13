import {
  BlockNoteEditor,
  BlockNoteExtension,
  UnreachableCaseError,
} from "@blocknote/core";
import {
  applySuggestions,
  revertSuggestions,
  suggestChanges,
} from "@handlewithcare/prosemirror-suggest-changes";
import { LanguageModel } from "ai";
import { Plugin, PluginKey } from "prosemirror-state";
import { fixTablesKey } from "prosemirror-tables";
import { createStore } from "zustand/vanilla";
import { CallLLMResult } from "./api/formats/CallLLMResult.js";
import { PromptOrMessages, llm } from "./api/index.js";
import { LLMRequestOptions } from "./streamTool/callLLMWithStreamTools.js";
// type AIPluginState = {
//   aiMenuBlockID: string | undefined;
//   aiMenuResponseStatus: "initial" | "generating" | "error" | "done";
// };

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

// parameters that are shared across all calls and can be configured on the context as "application wide" settings
type GlobalLLMCallOptions = {
  model: LanguageModel;
  dataFormat?: "html" | "json" | "markdown";
  stream?: boolean;
};

// parameters that are specific to each call
type CallSpecificCallLLMOptions = Partial<GlobalLLMCallOptions> &
  Omit<LLMRequestOptions, "messages" | "model"> &
  PromptOrMessages & {
    defaultStreamTools?: {
      /** Enable the add tool (default: true) */
      add?: boolean;
      /** Enable the update tool (default: true) */
      update?: boolean;
      /** Enable the delete tool (default: true) */
      delete?: boolean;
    };
  };

// TO DISCUSS: extension vs plugin vs addon vs ..
export class AIExtension extends BlockNoteExtension {
  public static name(): string {
    return "ai";
  }

  /**
   * zustand design considerations
   *
   * - setters are not added in this store, but as class methods so we can have control over what to expose as API
   * - con: if we'd expose the store externally, consumers could still call store.setState :/ (for this store it's not desired, for `options` below, it is)
   *
   */
  public readonly store = createStore<AIPluginState>()((_set) => ({
    aiMenuState: "closed",
  }));

  /**
   * zustand design considerations
   *
   * - I decided to create a separate store for the options as they feel quite different from "internal state"
   *   above. They're not so much "state", but more "configuration". I still think it's useful to have in a Zustand
   *   store (instead of a just a plain object), because consumers might want to display the settings in the UI.
   *   Case can also be made to make this a plain and leave the responsibility of displaying settings to the consumer
   *   (and not have a store for this at all). TO DISCUSS
   */
  public readonly options: ReturnType<
    ReturnType<typeof createStore<Required<GlobalLLMCallOptions>>>
  >;

  // used for undo, not needed in store
  // private prevDocument: typeof this.editor.document | undefined;

  constructor(
    public readonly editor: BlockNoteEditor<any, any, any>,
    options: GlobalLLMCallOptions
  ) {
    super();
    this.options = createStore<Required<GlobalLLMCallOptions>>()((_set) => ({
      dataFormat: "html",
      stream: true,
      ...options,
    }));
  }

  /**
   * Open the AI menu at a specific block
   */
  public openAIMenuAtBlock(blockID: string) {
    this.editor.setForceSelectionVisible(true);
    this.editor.isEditable = false;
    this.store.setState({
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
    this.store.setState({
      aiMenuState: "closed",
    });
    this.editor.setForceSelectionVisible(false);
    this.editor.isEditable = true;
    this.editor.focus();
    // this.prevDocument = undefined;
  }

  /**
   * Accept the changes made by the LLM
   */
  public acceptChanges() {
    applySuggestions(this.editor.prosemirrorState, (tr) => {
      // TODO: @Nick, I don't think there's currently a cleaner way to do this?
      this.editor._tiptapEditor.dispatch(tr);
    });
    this.closeAIMenu();
  }

  /**
   * Reject the changes made by the LLM
   */
  public rejectChanges() {
    revertSuggestions(this.editor.prosemirrorState, (tr) => {
      // TODO: @Nick, I don't think there's currently a cleaner way to do this?
      this.editor._tiptapEditor.dispatch(tr);
    });
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
      | "user-reviewing"
  ) {
    const aiMenuState = this.store.getState().aiMenuState;
    if (aiMenuState === "closed") {
      return; // TODO: log error?
    }

    if (status === "ai-writing") {
      this.editor.setForceSelectionVisible(false);
    }

    this.store.setState({
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
    const options = {
      ...this.options.getState(),
      ...opts,
    };

    this.setAIResponseStatus("thinking");

    try {
      let ret: CallLLMResult;

      // TODO: maybe separate functions for streaming / non-streaming?
      if (options.dataFormat === "json") {
        throw new Error("not implemented");
        // ret = await llm.json.call(this.editor, options);
      } else if (options.dataFormat === "markdown") {
        throw new Error("not implemented");
        // ret = await llm.markdown.call(this.editor, options);
      } else if (options.dataFormat === "html") {
        ret = await llm.html.call(this.editor, {
          ...options,
          onStart: () => {
            this.setAIResponseStatus("ai-writing"); // TODO: also apply to other formats
          },
          onBlockUpdate: (blockId: string) => {
            // NOTE: does this setState with an anon object trigger unnecessary re-renders?
            this.store.setState({
              aiMenuState: {
                blockId,
                status: "ai-writing",
              },
            });
          },
        });
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

  public plugins = [
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
    suggestChanges(),
  ];
}

const PLUGIN_KEY = new PluginKey(`blocknote-ai-plugin`);

export function createAIExtension(options: GlobalLLMCallOptions) {
  return (editor: BlockNoteEditor<any, any, any>) => {
    return new AIExtension(editor, options);
  };
}

export function getAIExtension(editor: BlockNoteEditor<any, any, any>) {
  return editor.extension(AIExtension);
}
