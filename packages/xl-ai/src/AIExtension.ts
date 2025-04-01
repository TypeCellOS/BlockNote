import {
  BlockNoteEditor,
  BlockNoteExtension,
  UnreachableCaseError,
} from "@blocknote/core";
import { LanguageModel } from "ai";
import { createStore } from "zustand/vanilla";
import { PromptOrMessages, llm } from "./api";
import { LLMRequestOptions } from "./api/streamTool/callLLMWithStreamTools";

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
        status: "initial" | "generating" | "error" | "done";
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
  public readonly store = createStore<AIPluginState>()((set) => ({
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
  private prevDocument: typeof this.editor.document | undefined;

  constructor(
    public readonly editor: BlockNoteEditor<any, any, any>,
    options: GlobalLLMCallOptions
  ) {
    super();
    this.options = createStore<Required<GlobalLLMCallOptions>>()((set) => ({
      dataFormat: "html",
      stream: true,
      ...options,
    }));
  }

  /**
   * Open the AI menu at a specific block
   */
  public openAIMenuAtBlock(blockID: string) {
    this.store.setState({
      aiMenuState: {
        blockId: blockID,
        status: "initial",
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

    this.prevDocument = undefined;
  }

  /**
   * Accept the changes made by the LLM
   */
  public acceptChanges() {
    this.closeAIMenu();
  }

  /**
   * Reject the changes made by the LLM
   */
  public rejectChanges() {
    this.editor.replaceBlocks(this.editor.document, this.prevDocument!);
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
    status: "initial" | "generating" | "error" | "done"
  ) {
    const aiMenuState = this.store.getState().aiMenuState;
    if (aiMenuState === "closed") {
      return; // TODO: log error?
    }
    this.store.setState({
      aiMenuState: {
        status: status,
        blockId: aiMenuState.blockId,
      },
    });

    if (status === "generating") {
      // TODO: abort previous call?
      this.prevDocument = this.editor.document;
    }
    if (status === "initial") {
      this.prevDocument = undefined;
    }
  }

  /**
   * Execute a call to an LLM and apply the result to the editor
   */
  public async callLLM(opts: CallSpecificCallLLMOptions) {
    const options = {
      ...this.options.getState(),
      ...opts,
    };

    this.setAIResponseStatus("generating");

    try {
      let resultStream: Awaited<
        ReturnType<typeof llm.json.call>
      >["toolCallsStream"];

      if (options.dataFormat === "json") {
        const ret = await llm.json.call(this.editor, options);
        resultStream = ret.toolCallsStream;
      } else if (options.dataFormat === "markdown") {
        const ret = await llm.markdown.call(this.editor, options);
        resultStream = ret.toolCallsStream;
      } else if (options.dataFormat === "html") {
        const ret = await llm.html.call(this.editor, options);
        resultStream = ret.toolCallsStream;
      } else {
        throw new UnreachableCaseError(options.dataFormat);
      }

      for await (const operation of resultStream) {
        if (operation.result === "ok") {
          // TODO: check should be part of pipeline
          this.store.setState({
            aiMenuState: {
              blockId: operation.lastBlockId,
              status: "generating",
            },
          });
        }
      }

      this.setAIResponseStatus("done");
    } catch (e) {
      this.setAIResponseStatus("error");
      // eslint-disable-next-line no-console
      console.error(e);
    }
  }
}

export function createAIExtension(options: GlobalLLMCallOptions) {
  return (editor: BlockNoteEditor<any, any, any>) => {
    return new AIExtension(editor, options);
  };
}

export function getAIExtension(editor: BlockNoteEditor<any, any, any>) {
  return editor.extension(AIExtension);
}

// TODO: Revisit - this pattern might be a bit iffy
// Make editor non-editable after calling the LLM, until the user accepts or
// reverts the changes.
// useEffect(() => {
//   editor.isEditable = aiResponseStatus === "initial";
// }, [aiResponseStatus, editor]);
