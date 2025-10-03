import { Chat } from "@ai-sdk/react";
import {
  BlockNoteEditor,
  BlockNoteExtension,
  getNodeById,
  UnreachableCaseError,
} from "@blocknote/core";
import {
  applySuggestions,
  revertSuggestions,
  suggestChanges,
} from "@blocknote/prosemirror-suggest-changes";
import { UIMessage } from "ai";
import { Fragment, Slice } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import { fixTablesKey } from "prosemirror-tables";
import { createStore, StoreApi } from "zustand/vanilla";

import {
  aiDocumentFormats,
  buildAIRequest,
  defaultAIRequestSender,
  executeAIRequest,
} from "./api/index.js";
import { createAgentCursorPlugin } from "./plugins/AgentCursorPlugin.js";
import { AIRequestHelpers, InvokeAIOptions } from "./types.js";

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
};

const PLUGIN_KEY = new PluginKey(`blocknote-ai-plugin`);

export class AIExtension extends BlockNoteExtension {
  private chatSession:
    | {
        previousRequestOptions: InvokeAIOptions;
        chat: Chat<UIMessage>;
      }
    | undefined;

  private scrollInProgress = false;
  private autoScroll = false;

  public static key(): string {
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
   * These options are used by default across all LLM calls when calling {@link executeLLMRequest}
   */
  public readonly options: ReturnType<
    ReturnType<typeof createStore<AIRequestHelpers>>
  >;

  /**
   * @internal use `createAIExtension` instead
   */
  constructor(
    public readonly editor: BlockNoteEditor<any, any, any>,
    options: AIRequestHelpers & {
      /**
       * The name and color of the agent cursor
       *
       * @default { name: "AI", color: "#8bc6ff" }
       */
      agentCursor?: { name: string; color: string };
    },
  ) {
    super();

    this.options = createStore<AIRequestHelpers>()((_set) => ({
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

    // Listens for `scroll` and `scrollend` events to see if a new scroll was
    // started before an existing one ended. This is the most reliable way we
    // have of checking if a scroll event was caused by the user and not by
    // `scrollIntoView`, as the events are otherwise indistinguishable. If a
    // scroll was started before an existing one finished (meaning the user has
    // scrolled), auto scrolling is disabled.
    document.addEventListener(
      "scroll",
      () => {
        if (this.scrollInProgress) {
          this.autoScroll = false;
        }

        this.scrollInProgress = true;
      },
      true,
    );
    document.addEventListener(
      "scrollend",
      () => {
        this.scrollInProgress = false;
      },
      true,
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

    // Scrolls to the block when the menu opens.
    const blockElement = this.editor.domElement?.querySelector(
      `[data-node-type="blockContainer"][data-id="${blockID}"]`,
    );
    blockElement?.scrollIntoView({ block: "center" });
  }

  /**
   * Close the AI menu
   */
  public closeAIMenu() {
    this._store.setState({
      aiMenuState: "closed",
    });
    this.chatSession = undefined;
    this.editor.setForceSelectionVisible(false);
    this.editor.isEditable = true;
    this.editor.focus();
  }

  /**
   * Accept the changes made by the LLM
   */
  public acceptChanges() {
    // This is slightly convoluted, to try to maintain the undo history as much as possible
    // The idea is that the LLM call has appended a number of updates to the document, moving the document from state `A` to state `C`
    // But we want the undo history to skip all of the intermediate states and go straight from `C` to `A`
    // To do this, we capture the document state `C` (post-LLM call), and then reject the suggestions to recover the original document state `A`
    // Then we create an intermediate state `B` that captures the diff between `A` and `C`
    // Then we apply the suggestions to `B` to get the final state `C`
    // This causes the undo history to skip `B` and go straight from `C` back to `A`

    // Capture the document state `C'` (post-LLM call with all suggestions still in the document)
    const markedUpDocument = this.editor.prosemirrorState.doc;

    // revert the suggestions to get back to the original document state `A`
    this.editor.exec((state, dispatch) => {
      return revertSuggestions(state, (tr) => {
        dispatch?.(tr.setMeta("addToHistory", false));
      });
    });

    // Create an intermediate state `B` that captures the diff between the original document and the marked up document
    this.editor.exec((state, dispatch) => {
      const tr = state.tr;
      tr.replace(
        0,
        tr.doc.content.size,
        new Slice(Fragment.from(markedUpDocument), 0, 0),
      );
      const nextState = state.apply(tr);
      // Apply the suggestions to the intermediate state `B` to get the final state `C`
      return applySuggestions(nextState, (resultTr) => {
        dispatch?.(
          tr.replace(
            0,
            tr.doc.content.size,
            new Slice(Fragment.from(resultTr.doc), 0, 0),
          ),
        );
      });
    });

    // If in collaboration mode, merge the changes back into the original yDoc
    this.editor.forkYDocPlugin?.merge({ keepChanges: true });

    this.closeAIMenu();
  }

  /**
   * Reject the changes made by the LLM
   */
  public rejectChanges() {
    // Revert the suggestions to get back to the original document
    this.editor.exec((state, dispatch) => {
      return revertSuggestions(state, (tr) => {
        // Do so without adding to history (so the last undo step is just prior to the LLM call)
        dispatch?.(tr.setMeta("addToHistory", false));
      });
    });

    // If in collaboration mode, discard the changes and revert to the original yDoc
    this.editor.forkYDocPlugin?.merge({ keepChanges: false });
    this.closeAIMenu();
  }

  /**
   * Retry the previous LLM call.
   *
   * Only valid if the current status is "error"
   */
  public async retry() {
    const { aiMenuState } = this.store.getState();
    if (
      aiMenuState === "closed" ||
      aiMenuState.status !== "error" ||
      !this.chatSession
    ) {
      throw new Error("retry() is only valid when a previous response failed");
    }

    /*
    Design decisions:
    - we cannot use chat.regenerate() because the document might have been updated already by toolcalls that failed mid-way
    - we also cannot revert the document changes and use chat.regenerate(), 
      because we might want to retry a subsequent user-direction that failed, not the original one
    - this means we always need to send the new document state to the LLM
    - an alternative would be to take a snapshot of the document before the LLM call, and revert to that specific state
      when a call fails
    */

    if (this.chatSession?.chat.status === "error") {
      // the LLM call failed (i.e. a network error)
      // console.log("retry failed LLM call", this.chatSession.chat.error);
      return this.invokeAI({
        ...this.chatSession.previousRequestOptions,
        userPrompt: `An error occured in the previous request. Please retry to accomplish the last user prompt.`,
      });
    } else {
      // an error occurred while parsing / executing the previous LLM call
      // give the LLM a chance to fix the error
      // console.log("retry failed tool execution");
      return this.invokeAI({
        ...this.chatSession.previousRequestOptions,
        userPrompt: `An error occured while executing the previous tool call. Please retry to accomplish the last user prompt.`,
      });
    }
  }

  /**
   * Update the status of a call to an LLM
   *
   * @warning This method should usually only be used for advanced use-cases
   * if you want to implement how an LLM call is executed. Usually, you should
   * use {@link executeLLMRequest} instead which will handle the status updates for you.
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
      return;
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
   * @deprecated Use {@link invokeAI} instead
   */
  public async callLLM(opts: InvokeAIOptions) {
    return this.invokeAI(opts);
  }

  /**
   * Execute a call to an LLM and apply the result to the editor
   */
  public async invokeAI(opts: InvokeAIOptions) {
    this.setAIResponseStatus("thinking");
    this.editor.forkYDocPlugin?.fork();

    try {
      if (!this.chatSession) {
        // note: in the current implementation opts.transport is only used when creating a new chat
        // (so changing transport for a subsequent call in the same chat-session is not supported)
        this.chatSession = {
          previousRequestOptions: opts,
          chat: new Chat<UIMessage>({
            sendAutomaticallyWhen: () => false,
            transport: opts.transport || this.options.getState().transport,
          }),
        };
      } else {
        this.chatSession.previousRequestOptions = opts;
      }
      const chat = this.chatSession.chat;

      // merge the global options with the local options
      const globalOpts = this.options.getState();
      opts = {
        ...globalOpts,
        ...opts,
      } as InvokeAIOptions;

      const sender =
        opts.aiRequestSender ??
        defaultAIRequestSender(
          aiDocumentFormats.html.defaultPromptBuilder,
          aiDocumentFormats.html.defaultPromptInputDataBuilder,
        );

      const aiRequest = buildAIRequest({
        editor: this.editor,
        chat,
        userPrompt: opts.userPrompt,
        useSelection: opts.useSelection,
        deleteEmptyCursorBlock: opts.deleteEmptyCursorBlock,
        streamToolsProvider: opts.streamToolsProvider,
        onBlockUpdated: (blockId: string) => {
          // NOTE: does this setState with an anon object trigger unnecessary re-renders?
          this._store.setState({
            aiMenuState: {
              blockId,
              status: "ai-writing",
            },
          });

          // Scrolls to the block being edited by the AI while auto scrolling is
          // enabled.
          if (!this.autoScroll) {
            return;
          }

          const aiMenuState = this._store.getState().aiMenuState;
          const aiMenuOpenState =
            aiMenuState === "closed" ? undefined : aiMenuState;
          if (!aiMenuOpenState || aiMenuOpenState.status !== "ai-writing") {
            return;
          }

          const nodeInfo = getNodeById(
            aiMenuOpenState.blockId,
            this.editor.prosemirrorState.doc,
          );
          if (!nodeInfo) {
            return;
          }

          const blockElement = this.editor.prosemirrorView.domAtPos(
            nodeInfo.posBeforeNode + 1,
          );
          (blockElement.node as HTMLElement).scrollIntoView({
            block: "center",
          });
        },
      });

      await executeAIRequest({
        aiRequest,
        sender,
        chatRequestOptions: opts.chatRequestOptions,
        onStart: () => {
          this.autoScroll = true;
          this.setAIResponseStatus("ai-writing");
        },
      });

      this.setAIResponseStatus("user-reviewing");
    } catch (e) {
      this.setAIResponseStatus({
        status: "error",
        error: e,
      });
      // eslint-disable-next-line no-console
      console.warn("Error calling LLM", e, this.chatSession?.chat.messages);
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
