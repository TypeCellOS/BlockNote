import { Chat } from "@ai-sdk/react";
import {
  type Block,
  type BlockNoteEditor,
  createExtension,
  createStore,
  type ExtensionOptions,
} from "@blocknote/core";
import type { ChatTransport, UIMessage, UIMessageChunk } from "ai";
import type { Plugin } from "prosemirror-state";

import { AIExtension } from "../../AIExtension.js";
import { recordReview } from "../agent/chatReview.js";
import type { ToolCallReview } from "../tools/documentTools.js";
import { observeTransport } from "./transport.js";

// The document agent in an editor, for each mode. This file has the part
// that all modes share: the chat, the runs, the states, and the AI menu.
// A mode gives the review: how the editor shows the changes of the agent,
// and what an accept and a reject do (see `ClientMode`).
//
// - Proposal mode: `proposalMode.ts`, the extension `DocumentAgentExtension`.
// - Yjs 14 mode: `yjs14/client`, the extension `SuggestionAgentExtension`.

/** The key of the document agent extension of an editor, in each mode. */
export const DOCUMENT_AGENT_KEY = "documentAgent";

/** One tool call of the agent in a review, with the decision of a user. */
export type ReviewedToolCall = {
  toolCallId: string;
  /** The reason that the agent gave for the changes of this call. */
  reason: string;
  state: "open" | ToolCallReview;
};

/** The data of a review that each mode has: the tool calls of the agent. */
export type ReviewData = { toolCalls: readonly ReviewedToolCall[] };

/** The review of a state: the data of the mode, and the last answer of the agent. */
export type ReviewOf<Data extends ReviewData> = Data & {
  /** The text that the agent wrote to the user in the last run. */
  answer: string;
};

/**
 * The state of the document agent in an editor.
 *
 * - `idle`: no review.
 * - `running`: the agent works.
 * - `reviewing`: the user accepts or rejects.
 * - `error`: the request failed, or the data of this client is not the
 *   data of the host (`out-of-sync`). The review stays, thus the user can
 *   accept or reject what arrived.
 */
export type AgentState<Data extends ReviewData> =
  | { status: "idle" }
  | { status: "running"; review: ReviewOf<Data> }
  | { status: "reviewing"; review: ReviewOf<Data> }
  | {
      status: "error";
      error: "request-failed" | "out-of-sync";
      review: ReviewOf<Data>;
    };

/** The options of the document agent that all modes share. */
export type AgentExtensionOptions = {
  /**
   * Where the loop runs. A transport to a server (for example
   * `DefaultChatTransport`) is server mode. `createInProcessTransport` is
   * client mode. The extension is the same for the two.
   */
  transport?: ChatTransport<UIMessage>;
  /**
   * What a run or a review does if it starts while the AI menu is closed
   * (a chat window, a followed run, a review that a host starts). With
   * true (the default), the AI menu opens: it locks the editor, and has the
   * items that accept and reject. With false, the menu stays closed, and
   * the extension locks the editor itself if the mode needs a lock: an app
   * with its own review surface (for example a chat window) uses this.
   */
  aiMenu?: boolean;
};

/** The AI menu of the editor, if the editor has `AIExtension`. */
function aiMenuOf(editor: BlockNoteEditor<any, any, any>) {
  return editor.getExtension(AIExtension);
}

/** What the shared part of the extension gives to a mode. */
export type ModeContext<Data extends ReviewData> = {
  editor: BlockNoteEditor<any, any, any>;
  /** The state of the extension. A mode reads it, and sets the data of its review. */
  store: ReturnType<typeof createStore<AgentState<Data>>>;
  /** The AI menu of the editor, if the editor has `AIExtension`. */
  aiMenu: () => ReturnType<typeof aiMenuOf>;
  /** Sets the state `error`. No effect in the state `idle`. */
  fail: (error: "request-failed" | "out-of-sync") => void;
  /** Ends the review: the mode hides it, and the state is `idle`. */
  reset: () => void;
  /**
   * Puts the decision of the user into the outputs of the tool calls in
   * the chat. Thus, the agent knows it in a later run, and a chat window
   * shows it.
   */
  record: (toolCallIds: readonly string[], review: ToolCallReview) => void;
  /**
   * Makes sure that the editor is locked for a review that starts while
   * the AI menu is closed (see `AgentExtensionOptions.aiMenu`).
   */
  lockEditor: (blockId: string | undefined) => void;
};

/**
 * The review of one mode in an editor: how the editor shows the changes of
 * the agent, and what the decisions of a user do. `Api` has the functions
 * that only this mode has: the extension has them also.
 */
export type ClientMode<Data extends ReviewData, Api extends object> = {
  /**
   * True if the editor must be read-only during a run and a review: the
   * display of the mode is not the main document.
   */
  locksEditor: boolean;
  /** The data of a new review, for a run that starts in the state `idle`. */
  startReview(): Data;
  /** Called at the end of a run, in the state `reviewing`. */
  endRun?(): void;
  /** Gets each chunk of the stream of a run that the shared part does not handle. */
  onChunk?(chunk: UIMessageChunk): void;
  /** The body of the request of a run, next to the chat messages. */
  requestBody?(review: ReviewOf<Data>): object | undefined;
  /** Removes the display of the review from the editor, before the state `idle`. */
  hide(): void;
  /**
   * The main document of the editor: the document without the changes of
   * the agent that no user accepted. An app saves this document, never
   * `editor.document`.
   */
  mainDocument(): Block<any, any, any>[];
  /** Accepts all changes of the agent that have no decision. */
  acceptAll(): void;
  /** Rejects all changes of the agent that have no decision. */
  rejectAll(): void;
  /** Accepts the changes of one tool call. The other changes stay. */
  acceptToolCall(toolCallId: string): void;
  /** Rejects the changes of one tool call. The other changes stay. */
  rejectToolCall(toolCallId: string): void;
  prosemirrorPlugins?: Plugin[];
  /** Called when the editor mounts. Returns a function for the unmount. */
  mount?(): (() => void) | undefined;
  api: Api;
};

/**
 * Makes the document agent extension of one mode. The extension sends the
 * prompts of the user, follows the runs, and keeps the state. The mode
 * shows the changes of the agent, and applies the decisions of the user.
 *
 * A run that a user starts sends a prompt with `invoke`. A run that a
 * different client or a caller outside the editors started is followed
 * with `follow`.
 *
 * The extension needs `AIExtension` in the same editor for the AI menu.
 */
export function createAgentExtension<
  Data extends ReviewData,
  Options extends AgentExtensionOptions,
  Api extends object,
>(
  createMode: (
    context: ModeContext<Data>,
    options: Options | undefined,
  ) => ClientMode<Data, Api>,
) {
  return createExtension(
    ({ editor, options }: ExtensionOptions<Options | undefined>) => {
      const store = createStore<AgentState<Data>>({ status: "idle" });
      /** The chat of this editor. It stays for all runs and all reviews. */
      let chat: Chat<UIMessage> | undefined;
      /**
       * The number of the run in progress. A reset adds one: a run that ends
       * after a reset must not change the state.
       */
      let runNumber = 0;
      /** The number of chunks of all runs. It tells if a followed run had a stream. */
      let chunkCount = 0;
      /** True if this extension locked the editor (see `aiMenu`). */
      let locked = false;

      function aiMenu() {
        return aiMenuOf(editor);
      }

      function lockEditor(blockId: string | undefined) {
        const ai = aiMenu();
        if (ai === undefined || ai.store.state.aiMenuState !== "closed") {
          return;
        }
        if (options?.aiMenu === false) {
          if (mode.locksEditor) {
            locked = true;
            editor.isEditable = false;
          }
        } else if (blockId !== undefined && editor.getBlock(blockId)) {
          ai.openAIMenuAtBlock(blockId);
        }
      }

      function unlockEditor() {
        if (locked) {
          locked = false;
          editor.isEditable = true;
        }
      }

      function getChat(): Chat<UIMessage> {
        const transport = options?.transport;
        if (transport === undefined) {
          throw new Error("The document agent has no transport");
        }
        chat ??= new Chat<UIMessage>({
          transport: observeTransport(transport, onChunk),
        });
        return chat;
      }

      function fail(error: "request-failed" | "out-of-sync") {
        const state = store.state;
        if (state.status === "idle") {
          return;
        }
        store.setState({ status: "error", error, review: state.review });
        // The menu shows a fixed text for an error, not the error itself.
        aiMenu()?.setAIResponseStatus({ status: "error", error });
      }

      /** Handles one chunk of the UI message stream of a run. */
      function onChunk(chunk: UIMessageChunk) {
        chunkCount++;
        const state = store.state;
        if (state.status !== "running") {
          return;
        }
        if (chunk.type === "text-delta") {
          store.setState({
            ...state,
            review: {
              ...state.review,
              answer: state.review.answer + chunk.delta,
            },
          });
        } else if (
          chunk.type === "error" ||
          chunk.type === "tool-output-error"
        ) {
          // A tool gives its expected failures as values. A tool error in
          // the stream is a tool that threw: the run failed.
          fail("request-failed");
        } else {
          mode.onChunk?.(chunk);
        }
      }

      function record(toolCallIds: readonly string[], review: ToolCallReview) {
        if (chat !== undefined && toolCallIds.length > 0) {
          chat.messages = recordReview(
            chat.messages,
            new Map(toolCallIds.map((id) => [id, review])),
          );
        }
      }

      /** Ends the review: the editor shows the main document, without a review. */
      function reset() {
        runNumber++;
        // The chat stays, with its messages: only its stream stops.
        void chat?.stop();
        // The display of the mode goes before the state is `idle`.
        mode.hide();
        store.setState({ status: "idle" });
        unlockEditor();
        aiMenu()?.closeAIMenu();
      }

      /**
       * Starts a run: the state is `running`, with the review that the run
       * continues, or with a new review. Returns the number of the run, or
       * `undefined` if a run is in progress.
       */
      function beginRun(): number | undefined {
        const state = store.state;
        if (state.status === "running") {
          return undefined;
        }
        const review: ReviewOf<Data> =
          state.status === "idle"
            ? { ...mode.startReview(), answer: "" }
            : { ...state.review, answer: "" };
        store.setState({ status: "running", review });
        // The AI menu starts a run with the menu open. A chat and a followed
        // run do not.
        lockEditor(editor.getTextCursorPosition().block.id);
        aiMenu()?.setAIResponseStatus("thinking");
        return ++runNumber;
      }

      /** Ends the run with the number: the state is `reviewing`, or `error`. */
      function endRun(run: number) {
        const after = store.state;
        if (after.status !== "running" || runNumber !== run) {
          // The run failed, or the user closed the review.
          return;
        }
        if (getChat().status === "error") {
          fail("request-failed");
          return;
        }
        store.setState({ status: "reviewing", review: after.review });
        aiMenu()?.setAIResponseStatus("user-reviewing");
        mode.endRun?.();
      }

      const mode = createMode(
        { editor, store, aiMenu, fail, reset, record, lockEditor },
        options,
      );

      return {
        key: DOCUMENT_AGENT_KEY,
        store,
        prosemirrorPlugins: mode.prosemirrorPlugins ?? [],
        mount() {
          const unmountMode = mode.mount?.();
          // The AI menu can close without this extension, for example when
          // the user clicks outside the menu. Then the review ends.
          const unsubscribe = aiMenu()?.store.subscribe(({ currentVal }) => {
            if (
              currentVal.aiMenuState === "closed" &&
              store.state.status !== "idle"
            ) {
              reset();
            }
          });
          return () => {
            unsubscribe?.();
            unmountMode?.();
          };
        },

        /**
         * Sends a prompt of the user to the agent. The first prompt starts a
         * review. A later prompt continues the review in progress.
         */
        async invoke(prompt: string) {
          const current = getChat();
          const run = beginRun();
          if (run === undefined) {
            return;
          }
          const state = store.state;
          const body =
            state.status === "idle"
              ? undefined
              : mode.requestBody?.(state.review);
          await current.sendMessage(
            { role: "user", parts: [{ type: "text", text: prompt }] },
            { body },
          );
          endRun(run);
        },

        /**
         * Follows the run in progress of this document that this client did
         * not start: a run of another editor, or a run that a caller outside
         * the editors started. The chat connects to the stream of the run
         * (`reconnectToStream` of the transport).
         *
         * Returns false if the transport has no run in progress.
         */
        async follow(): Promise<boolean> {
          const current = getChat();
          const before = store.state;
          const menuWasClosed = aiMenu()?.store.state.aiMenuState === "closed";
          const wasLocked = locked;
          const run = beginRun();
          if (run === undefined) {
            return false;
          }
          const chunksBefore = chunkCount;
          await current.resumeStream();
          if (chunkCount === chunksBefore && runNumber === run) {
            // No stream: there is no run. The state is as before.
            store.setState(before);
            if (!wasLocked) {
              unlockEditor();
            }
            if (menuWasClosed) {
              aiMenu()?.closeAIMenu();
            } else if (before.status !== "idle") {
              aiMenu()?.setAIResponseStatus("user-reviewing");
            }
            return false;
          }
          endRun(run);
          return true;
        },

        /**
         * The main document of the editor, in each state (see
         * `ClientMode.mainDocument`).
         */
        mainDocument() {
          return mode.mainDocument();
        },

        /**
         * The chat of this editor (the `Chat` of the AI SDK), with the
         * messages of all runs. A chat window shows it, for example with
         * `useChat({ chat })`.
         */
        getChat,

        /** Stops the run. The changes that arrived stay for the review. */
        async abort() {
          await chat?.stop();
        },

        acceptAll: () => mode.acceptAll(),
        rejectAll: () => mode.rejectAll(),
        acceptToolCall: (toolCallId: string) => mode.acceptToolCall(toolCallId),
        rejectToolCall: (toolCallId: string) => mode.rejectToolCall(toolCallId),

        /**
         * Ends the review without a decision of this user. An app uses this
         * when the review ended in a different place, for example in
         * another editor of the document.
         */
        dismiss() {
          if (store.state.status !== "idle") {
            reset();
          }
        },

        ...mode.api,
      } as const;
    },
  );
}
