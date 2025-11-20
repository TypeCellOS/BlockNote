import { Chat } from "@ai-sdk/react";
import {
  createExtension,
  createStore,
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

import {
  aiDocumentFormats,
  buildAIRequest,
  defaultAIRequestSender,
  executeAIRequest,
} from "./api/index.js";
import { createAgentCursorPlugin } from "./plugins/AgentCursorPlugin.js";
import { AIRequestHelpers, InvokeAIOptions } from "./types.js";
import { ShowSelection } from "../../core/src/extensions/ShowSelection/ShowSelection.js";
import { ForkYDoc } from "../../core/src/extensions/Collaboration/ForkYDoc.js";

type AIPluginState = {
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

declare module "@blocknote/core" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface BlockNoteEditorOptions<BSchema, ISchema, SSchema> {
    ai?: AIRequestHelpers & {
      /**
       * The name and color of the agent cursor
       *
       * @default { name: "AI", color: "#8bc6ff" }
       */
      agentCursor?: { name: string; color: string };
    };
  }
}

export const AIExtension = createExtension((editor, editorOptions) => {
  // TODO should we really expose it like this?
  const options = createStore<AIRequestHelpers>(editorOptions.ai ?? {});
  const store = createStore<AIPluginState>({
    aiMenuState: "closed",
  });
  let chatSession:
    | {
        previousRequestOptions: InvokeAIOptions;
        chat: Chat<UIMessage>;
      }
    | undefined;
  let autoScroll = false;

  return {
    key: "ai",
    options,
    store,
    init: ({ abortController }) => {
      let scrollInProgress = false;
      // Listens for `scroll` and `scrollend` events to see if a new scroll was
      // started before an existing one ended. This is the most reliable way we
      // have of checking if a scroll event was caused by the user and not by
      // `scrollIntoView`, as the events are otherwise indistinguishable. If a
      // scroll was started before an existing one finished (meaning the user has
      // scrolled), auto scrolling is disabled.
      document.addEventListener(
        "scroll",
        () => {
          if (scrollInProgress) {
            autoScroll = false;
          }

          scrollInProgress = true;
        },
        {
          capture: true,
          signal: abortController.signal,
        },
      );
      document.addEventListener(
        "scrollend",
        () => {
          scrollInProgress = false;
        },
        {
          capture: true,
          signal: abortController.signal,
        },
      );
    },
    plugins: [
      new Plugin({
        key: PLUGIN_KEY,
        filterTransaction: (tr) => {
          const menuState = store.state.aiMenuState;

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
      createAgentCursorPlugin(
        editorOptions.ai?.agentCursor || { name: "AI", color: "#8bc6ff" },
      ),
    ],

    /**
     * Open the AI menu at a specific block
     */
    openAIMenuAtBlock(blockID: string) {
      editor.getExtension(ShowSelection)?.showSelection(true);
      editor.isEditable = false;
      store.setState({
        aiMenuState: {
          blockId: blockID,
          status: "user-input",
        },
      });

      // Scrolls to the block when the menu opens.
      const blockElement = editor.domElement?.querySelector(
        `[data-node-type="blockContainer"][data-id="${blockID}"]`,
      );
      blockElement?.scrollIntoView({ block: "center" });
    },

    /**
     * Close the AI menu
     */
    closeAIMenu() {
      store.setState({
        aiMenuState: "closed",
      });
      chatSession = undefined;
      editor.getExtension(ShowSelection)?.showSelection(false);
      editor.isEditable = true;
      editor.focus();
    },

    /**
     * Accept the changes made by the LLM
     */
    acceptChanges() {
      // This is slightly convoluted, to try to maintain the undo history as much as possible
      // The idea is that the LLM call has appended a number of updates to the document, moving the document from state `A` to state `C`
      // But we want the undo history to skip all of the intermediate states and go straight from `C` to `A`
      // To do this, we capture the document state `C` (post-LLM call), and then reject the suggestions to recover the original document state `A`
      // Then we create an intermediate state `B` that captures the diff between `A` and `C`
      // Then we apply the suggestions to `B` to get the final state `C`
      // This causes the undo history to skip `B` and go straight from `C` back to `A`

      // Capture the document state `C'` (post-LLM call with all suggestions still in the document)
      const markedUpDocument = editor.prosemirrorState.doc;

      // revert the suggestions to get back to the original document state `A`
      editor.exec((state, dispatch) => {
        return revertSuggestions(state, (tr) => {
          dispatch?.(tr.setMeta("addToHistory", false));
        });
      });

      // Create an intermediate state `B` that captures the diff between the original document and the marked up document
      editor.exec((state, dispatch) => {
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
      editor.getExtension(ForkYDoc)?.merge({ keepChanges: true });

      this.closeAIMenu();
    },

    /**
     * Reject the changes made by the LLM
     */
    rejectChanges() {
      // Revert the suggestions to get back to the original document
      editor.exec((state, dispatch) => {
        return revertSuggestions(state, (tr) => {
          // Do so without adding to history (so the last undo step is just prior to the LLM call)
          dispatch?.(tr.setMeta("addToHistory", false));
        });
      });

      // If in collaboration mode, discard the changes and revert to the original yDoc
      editor.getExtension(ForkYDoc)?.merge({ keepChanges: false });
      this.closeAIMenu();
    },

    /**
     * Retry the previous LLM call.
     *
     * Only valid if the current status is "error"
     */
    async retry() {
      const { aiMenuState } = store.state;
      if (
        aiMenuState === "closed" ||
        aiMenuState.status !== "error" ||
        !chatSession
      ) {
        throw new Error(
          "retry() is only valid when a previous response failed",
        );
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

      if (chatSession?.chat.status === "error") {
        // the LLM call failed (i.e. a network error)
        // console.log("retry failed LLM call", this.chatSession.chat.error);
        return this.invokeAI({
          ...chatSession.previousRequestOptions,
          userPrompt: `An error occured in the previous request. Please retry to accomplish the last user prompt.`,
        });
      } else {
        // an error occurred while parsing / executing the previous LLM call
        // give the LLM a chance to fix the error
        // console.log("retry failed tool execution");
        return this.invokeAI({
          ...chatSession.previousRequestOptions,
          userPrompt: `An error occured while executing the previous tool call. Please retry to accomplish the last user prompt.`,
        });
      }
    },

    /**
     * Update the status of a call to an LLM
     *
     * @warning This method should usually only be used for advanced use-cases
     * if you want to implement how an LLM call is executed. Usually, you should
     * use {@link executeLLMRequest} instead which will handle the status updates for you.
     */
    setAIResponseStatus(
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
      const aiMenuState = store.state.aiMenuState;
      if (aiMenuState === "closed") {
        return;
      }

      if (status === "ai-writing") {
        editor.getExtension(ShowSelection)?.showSelection(false);
      }

      if (typeof status === "object") {
        if (status.status !== "error") {
          throw new UnreachableCaseError(status.status);
        }
        store.setState({
          aiMenuState: {
            status: status.status,
            error: status.error,
            blockId: aiMenuState.blockId,
          },
        });
      } else {
        store.setState({
          aiMenuState: {
            status: status,
            blockId: aiMenuState.blockId,
          },
        });
      }
    },

    /**
     * @deprecated Use {@link invokeAI} instead
     */
    async callLLM(opts: InvokeAIOptions) {
      return this.invokeAI(opts);
    },

    /**
     * Execute a call to an LLM and apply the result to the editor
     */
    async invokeAI(opts: InvokeAIOptions) {
      this.setAIResponseStatus("thinking");
      editor.getExtension(ForkYDoc)?.fork();

      try {
        if (!chatSession) {
          // note: in the current implementation opts.transport is only used when creating a new chat
          // (so changing transport for a subsequent call in the same chat-session is not supported)
          chatSession = {
            previousRequestOptions: opts,
            chat: new Chat<UIMessage>({
              sendAutomaticallyWhen: () => false,
              transport: opts.transport || options.state.transport,
            }),
          };
        } else {
          chatSession.previousRequestOptions = opts;
        }
        const chat = chatSession.chat;

        // merge the global options with the local options
        const globalOpts = options.state;
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
          editor,
          chat,
          userPrompt: opts.userPrompt,
          useSelection: opts.useSelection,
          deleteEmptyCursorBlock: opts.deleteEmptyCursorBlock,
          streamToolsProvider: opts.streamToolsProvider,
          onBlockUpdated: (blockId) => {
            // NOTE: does this setState with an anon object trigger unnecessary re-renders?
            store.setState({
              aiMenuState: {
                blockId,
                status: "ai-writing",
              },
            });

            // Scrolls to the block being edited by the AI while auto scrolling is
            // enabled.
            if (!autoScroll) {
              return;
            }

            const aiMenuState = store.state.aiMenuState;
            const aiMenuOpenState =
              aiMenuState === "closed" ? undefined : aiMenuState;
            if (!aiMenuOpenState || aiMenuOpenState.status !== "ai-writing") {
              return;
            }

            const nodeInfo = getNodeById(
              aiMenuOpenState.blockId,
              editor.prosemirrorState.doc,
            );
            if (!nodeInfo) {
              return;
            }

            const blockElement = editor.prosemirrorView.domAtPos(
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
            autoScroll = true;
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
        console.warn("Error calling LLM", e, chatSession?.chat.messages);
      }
    },
  };
});
