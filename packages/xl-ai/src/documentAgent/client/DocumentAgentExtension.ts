import { Chat } from "@ai-sdk/react";
import {
  createExtension,
  createStore,
  type ExtensionOptions,
} from "@blocknote/core";
import type { ChatTransport, UIMessage, UIMessageChunk } from "ai";
import type { Node } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

import { AIExtension } from "../../AIExtension.js";
import { recordReview } from "../agent/chatReview.js";
import {
  DOCUMENT_BATCHES_CHUNK,
  DOCUMENT_PROPOSAL_CHUNK,
} from "../agent/earlyToolCalls.js";
import { updateDocument } from "../../api/v2/index.js";
import {
  blockOf,
  deriveSuggestions,
  suggestionIdOf,
  type ToolCallInfo,
  toolCallsOf,
  toolCallsOfBlocks,
} from "../proposal/derive.js";
import {
  createProposal,
  isProposalShape,
  headlessEditorFactory,
  replayProposal,
  withBatch,
} from "../proposal/proposal.js";
import {
  acceptAllChange,
  acceptToolCall,
  revertToolCall,
} from "../proposal/review.js";
import type { Batch, Proposal } from "../proposal/types.js";
import type { ToolCallReview } from "../tools/documentTools.js";
import { clearSuggestions, showSuggestions } from "./suggestions.js";
import {
  type DocumentAgentRequestBody,
  observeTransport,
} from "./transport.js";

/** One tool call in the review, with what the display shows for it. */
export type ReviewToolCall = ToolCallInfo & {
  /** The blocks that the display shows as suggestions of this call. */
  suggestedBlockIds: string[];
  /**
   * The blocks of this call that another open tool call also changed. The
   * display shows such a block as a suggestion of the last call.
   */
  sharedBlockIds: string[];
};

/** A proposal in review: the proposal, its tool calls, and the last answer of the agent. */
export type Review = {
  proposal: Proposal;
  toolCalls: ReviewToolCall[];
  /** The number of operations that the display shows as suggestions. */
  suggestionCount: number;
  /** The text that the agent wrote to the user in the last run. */
  answer: string;
};

/**
 * The state of the document agent in an editor.
 *
 * - `idle`: no proposal. The document of the editor has no suggestion
 *   marks: it is the main document. In the other states, it can have
 *   suggestion marks, and an app must not save it as the main document.
 *   An app that saves the main document saves it in this state: after a
 *   change of the editor, and when the state becomes `idle` (the accept of
 *   a proposal changes the document before that).
 * - `running`: the agent works. The display shows each batch when its tool
 *   call is complete.
 * - `reviewing`: the user accepts or rejects.
 * - `error`: the request failed, or the proposal of this client is not the
 *   proposal of the host (`out-of-sync`). The review stays, thus the user
 *   can accept or reject what arrived.
 */
export type DocumentAgentState =
  | { status: "idle" }
  | { status: "running"; review: Review }
  | { status: "reviewing"; review: Review }
  | {
      status: "error";
      error: "request-failed" | "out-of-sync";
      review: Review;
    };

export type DocumentAgentExtensionOptions = {
  /**
   * Where the loop runs. A transport to a server (for example
   * `DefaultChatTransport`) is server mode. `createInProcessTransport` is
   * client mode. The extension is the same for the two.
   */
  transport?: ChatTransport<UIMessage>;
  /**
   * Called after a user accepts or rejects one tool call. A host that keeps
   * the proposal in a store saves the batch there.
   */
  onReview?: (batch: Batch, proposal: Proposal) => void;
  /** Called after a user accepts or rejects the full proposal. */
  onClose?: (result: "accepted" | "rejected", proposal: Proposal) => void;
  /**
   * What a run or a proposal does if it starts while the AI menu is closed
   * (a chat window, a followed run, a proposal of a host). With true (the
   * default), the AI menu opens: it locks the editor, and has the items
   * that accept and reject. With false, the extension locks the editor
   * itself, and the menu stays closed: an app with its own review surface
   * (for example a chat window) uses this.
   */
  aiMenu?: boolean;
  /**
   * The replay animation: the insertions of the newest batch show one after
   * the other, and the text of each one shows from its start to its end.
   * The document has the full batch at once: the animation is only in the
   * view. The default is true.
   */
  replayAnimation?: boolean;
};

/** The time of the replay animation for one character of inserted text. */
const REPLAY_MS_PER_CHARACTER = 12;

/**
 * The document agent in an editor: it sends the prompts of the user, keeps
 * the copy of the proposal of this client, shows the proposal as
 * suggestions, and applies the review of the user.
 *
 * The code is the same for all modes. A run that a user starts sends a
 * prompt with `invoke`. A run that a server starts gives its proposal to
 * `openProposal`. The display and the accept are the same.
 *
 * The extension needs `AIExtension` in the same editor: that extension has
 * the suggestion marks and the state of the AI menu.
 */
export const DocumentAgentExtension = createExtension(
  ({
    editor,
    options,
  }: ExtensionOptions<DocumentAgentExtensionOptions | undefined>) => {
    const store = createStore<DocumentAgentState>({ status: "idle" });
    const createEditor = headlessEditorFactory({ schema: editor.schema });
    /** The chat of this editor. It stays for all runs and all proposals. */
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

    /**
     * Makes sure that the editor is locked for a run or a review that
     * starts while the AI menu is closed: the AI menu opens at the block,
     * or the extension locks the editor itself (see `aiMenu`).
     */
    function lockEditor(blockId: string | undefined) {
      const ai = aiMenu();
      if (ai === undefined || ai.store.state.aiMenuState !== "closed") {
        return;
      }
      if (options?.aiMenu === false) {
        locked = true;
        editor.isEditable = false;
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
    /** The suggestion IDs of the batches that arrived last: the replay animation shows them. */
    let newest = new Set<number>();

    /** The decorations of the replay animation, for the insertions of the newest batches. */
    function replayDecorations(doc: Node): DecorationSet | null {
      if (newest.size === 0 || options?.replayAnimation === false) {
        return null;
      }
      const decorations: Decoration[] = [];
      // Each insertion starts when the insertion before it is complete.
      let delay = 0;
      doc.descendants((node, pos) => {
        const isNew = node.marks.some(
          (mark) => mark.type.name === "insertion" && newest.has(mark.attrs.id),
        );
        if (!isNew) {
          return true;
        }
        const duration = node.isInline
          ? Math.min(
              1500,
              Math.max(150, node.nodeSize * REPLAY_MS_PER_CHARACTER),
            )
          : 300;
        const attrs = {
          class: node.isInline ? "bn-agent-new" : "bn-agent-new-block",
          style: `--bn-agent-delay: ${delay}ms; --bn-agent-duration: ${duration}ms`,
        };
        decorations.push(
          node.isInline
            ? Decoration.inline(pos, pos + node.nodeSize, attrs)
            : Decoration.node(pos, pos + node.nodeSize, attrs),
        );
        delay += duration;
        // The content of a new block shows with the block.
        return node.isInline;
      });
      return DecorationSet.create(doc, decorations);
    }

    function aiMenu() {
      return editor.getExtension(AIExtension);
    }

    /** Derives the suggestions of the proposal for the current document, and shows them. */
    function display(
      proposal: Proposal,
    ): Pick<Review, "toolCalls" | "suggestionCount"> {
      clearSuggestions(editor);
      const derived = deriveSuggestions(editor, createEditor, proposal);
      showSuggestions(editor, derived);

      const suggested = new Map<string, Set<string>>();
      derived.operations.forEach((operation, index) => {
        const toolCallId = derived.toolCallIds[index];
        if (toolCallId !== undefined) {
          const blocks = suggested.get(toolCallId) ?? new Set();
          suggested.set(toolCallId, blocks.add(blockOf(operation)));
        }
      });
      const byBlock = toolCallsOfBlocks(proposal);
      return {
        suggestionCount: derived.operations.length,
        toolCalls: toolCallsOf(proposal).map((call) => ({
          ...call,
          suggestedBlockIds: [...(suggested.get(call.toolCallId) ?? [])],
          sharedBlockIds:
            call.state === "open"
              ? call.changedBlockIds.filter(
                  (id) => (byBlock.get(id)?.length ?? 0) > 1,
                )
              : [],
        })),
      };
    }

    /** Sets the proposal of a state with a review, and shows it. */
    function setProposal(proposal: Proposal) {
      const state = store.state;
      if (state.status === "idle") {
        return;
      }
      store.setState({
        ...state,
        review: { ...state.review, proposal, ...display(proposal) },
      });
    }

    /**
     * Ends the review if each tool call has a decision of the user and no
     * suggestion is left.
     */
    function closeIfDone() {
      const state = store.state;
      if (state.status !== "reviewing" && state.status !== "error") {
        return;
      }
      const { proposal, toolCalls, suggestionCount } = state.review;
      if (
        suggestionCount > 0 ||
        toolCalls.some((call) => call.state === "open")
      ) {
        return;
      }
      reset();
      options?.onClose?.(
        toolCalls.some((call) => call.state === "accepted")
          ? "accepted"
          : "rejected",
        proposal,
      );
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

    /** Applies the batches of a tool output to the copy of the proposal of this client. */
    function applyBatches(batches: Batch[]) {
      const state = store.state;
      if (state.status !== "running" || batches.length === 0) {
        return;
      }
      let proposal = state.review.proposal;
      // The stream has each batch two times: in a data chunk when its tool
      // call ends, and in the tool output. The second one is not new.
      const fresh = batches.filter((batch) => {
        const known = proposal.batches[batch.seq - 1];
        return known === undefined || known.hash !== batch.hash;
      });
      if (fresh.length === 0) {
        return;
      }
      for (const batch of fresh) {
        if (batch.seq !== proposal.batches.length + 1) {
          fail("out-of-sync");
          return;
        }
        proposal = withBatch(proposal, batch);
      }
      // The document of this client must have the hash of the last batch.
      if (replayProposal(createEditor, proposal).error !== undefined) {
        fail("out-of-sync");
        return;
      }
      aiMenu()?.setAIResponseStatus("ai-writing");
      // The replay animation shows the tool calls of these batches.
      newest = new Set(
        fresh.flatMap((batch) =>
          batch.source.type === "tool-call" ? [suggestionIdOf(batch)] : [],
        ),
      );
      setProposal(proposal);
    }

    /**
     * Takes the proposal that a host sends at the start of a run as the
     * copy of this client. A host that keeps the proposal sends it: the
     * proposal can have batches that this client does not have.
     */
    function adoptProposal(data: unknown) {
      const proposal: unknown = (data as { proposal?: unknown } | null)
        ?.proposal;
      if (
        !isProposalShape(proposal) ||
        replayProposal(createEditor, proposal).error !== undefined
      ) {
        fail("out-of-sync");
        return;
      }
      setProposal(proposal);
    }

    /** Handles one chunk of the UI message stream of a run. */
    function onChunk(chunk: UIMessageChunk) {
      chunkCount++;
      const state = store.state;
      if (state.status !== "running") {
        return;
      }
      if (chunk.type === "tool-output-available") {
        applyBatches(batchesOf(chunk.output));
      } else if (chunk.type === DOCUMENT_BATCHES_CHUNK) {
        applyBatches(batchesOf(chunk.data));
      } else if (chunk.type === DOCUMENT_PROPOSAL_CHUNK) {
        adoptProposal(chunk.data);
      } else if (chunk.type === "text-delta") {
        store.setState({
          ...state,
          review: {
            ...state.review,
            answer: state.review.answer + chunk.delta,
          },
        });
      } else if (chunk.type === "error" || chunk.type === "tool-output-error") {
        // A tool gives its expected failures as values. A tool error in the
        // stream is a tool that threw: the run failed.
        fail("request-failed");
      }
    }

    /**
     * Puts the decision of the user into the outputs of the tool calls in
     * the chat. Thus, the agent knows it in a later run, and a chat window
     * shows it.
     */
    function record(toolCallIds: readonly string[], review: ToolCallReview) {
      if (chat !== undefined && toolCallIds.length > 0) {
        chat.messages = recordReview(
          chat.messages,
          new Map(toolCallIds.map((id) => [id, review])),
        );
      }
    }

    /** The tool calls of a review that have no decision of the user. */
    function openToolCallIds(review: Review): string[] {
      return review.toolCalls
        .filter((call) => call.state === "open")
        .map((call) => call.toolCallId);
    }

    /** Ends the review: the editor shows the main document, without a proposal. */
    function reset() {
      runNumber++;
      newest = new Set();
      // The chat stays, with its messages: only its stream stops.
      void chat?.stop();
      // The suggestion marks go before the state is `idle` (see
      // `openProposal`).
      clearSuggestions(editor);
      store.setState({ status: "idle" });
      unlockEditor();
      aiMenu()?.closeAIMenu();
    }

    /**
     * Starts a run: the state is `running`, with the review that the run
     * continues, or with a new proposal of the current document. Returns
     * the number of the run, or `undefined` if a run is in progress.
     */
    function beginRun(): number | undefined {
      const state = store.state;
      if (state.status === "running") {
        return undefined;
      }
      const review: Review =
        state.status === "idle"
          ? {
              proposal: createProposal(editor.document),
              toolCalls: [],
              suggestionCount: 0,
              answer: "",
            }
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
      // The replay animation is only for a run: a later display of the
      // same suggestions must not show it again. A transaction without
      // steps makes the view compute its decorations again.
      newest = new Set();
      editor.exec((state, dispatch) => {
        dispatch?.(state.tr.setMeta("addToHistory", false));
        return true;
      });
      store.setState({ status: "reviewing", review: after.review });
      aiMenu()?.setAIResponseStatus("user-reviewing");
    }

    return {
      key: "documentAgent",
      store,
      prosemirrorPlugins: [
        new Plugin({
          key: new PluginKey("blocknote-document-agent"),
          props: {
            // The style sheet gives the suggestions of a proposal a color.
            attributes: (): Record<string, string> =>
              store.state.status === "idle"
                ? {}
                : { "data-agent-proposal": "true" },
            decorations: (state) => replayDecorations(state.doc),
          },
        }),
      ],
      mount() {
        // The AI menu can close without this extension, for example when
        // the user clicks outside the menu. Then the review ends.
        return aiMenu()?.store.subscribe(({ currentVal }) => {
          if (
            currentVal.aiMenuState === "closed" &&
            store.state.status !== "idle"
          ) {
            reset();
          }
        });
      },

      /**
       * Sends a prompt of the user to the agent. The first prompt starts a
       * proposal from the current document. A later prompt continues the
       * proposal in review. The request has the copy of the proposal of
       * this client: a host that keeps no proposal runs on it.
       */
      async invoke(prompt: string) {
        const current = getChat();
        const run = beginRun();
        if (run === undefined) {
          return;
        }
        const state = store.state;
        const body: DocumentAgentRequestBody | undefined =
          state.status === "idle"
            ? undefined
            : { proposal: state.review.proposal };
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
       * (`reconnectToStream` of the transport). The display and the review
       * are the same as for a run of this client.
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
       * The chat of this editor (the `Chat` of the AI SDK), with the
       * messages of all runs. A chat window shows it, for example with
       * `useChat({ chat })`.
       */
      getChat,

      /** Stops the run. The batches that arrived stay for the review. */
      async abort() {
        await chat?.stop();
      },

      /**
       * Opens a proposal that a host made, for example in a run that a
       * server started. The display and the review are the same as for a
       * run of this client. A later call with a newer version of the
       * proposal replaces the display.
       */
      openProposal(proposal: Proposal) {
        if (store.state.status === "running") {
          return;
        }
        if (replayProposal(createEditor, proposal).error !== undefined) {
          store.setState({
            status: "error",
            error: "out-of-sync",
            review: { proposal, toolCalls: [], suggestionCount: 0, answer: "" },
          });
          return;
        }
        const answer =
          store.state.status === "idle" ? "" : store.state.review.answer;
        // The state changes before the display. A listener of the editor
        // (for example a save of the document) must not get a document
        // with suggestion marks in the state `idle`.
        store.setState({
          status: "reviewing",
          review: { proposal, toolCalls: [], suggestionCount: 0, answer },
        });
        setProposal(proposal);
        const after = store.state;
        const toolCalls = after.status === "idle" ? [] : after.review.toolCalls;
        // The AI menu has the items that accept and reject the proposal.
        // It opens below a block: use the last block with a suggestion, as
        // the menu of a run that a user starts.
        lockEditor(
          toolCalls.flatMap((call) => call.suggestedBlockIds).at(-1) ??
            editor.document.at(-1)?.id,
        );
        aiMenu()?.setAIResponseStatus("user-reviewing");
      },

      /**
       * Accepts the full proposal: a write of the proposal onto the current
       * document, as a normal edit of the user. The changes that other
       * writers made after the fork point stay.
       */
      acceptAll() {
        const state = store.state;
        if (state.status === "idle" || state.status === "running") {
          return;
        }
        const { proposal } = state.review;
        clearSuggestions(editor);
        const result = updateDocument(
          editor,
          acceptAllChange(createEditor, proposal),
        );
        if (result.error !== undefined) {
          // The proposal document comes from an editor with this schema.
          throw new Error(`The accept of a proposal failed: ${result.error}`);
        }
        record(openToolCallIds(state.review), "accepted");
        reset();
        options?.onClose?.("accepted", proposal);
      },

      /** Rejects the full proposal: it goes, and the document does not change. */
      rejectAll() {
        const state = store.state;
        if (state.status === "idle") {
          return;
        }
        record(openToolCallIds(state.review), "rejected");
        reset();
        options?.onClose?.("rejected", state.review.proposal);
      },

      /** Accepts the changes of one tool call. The other suggestions stay. */
      acceptToolCall(toolCallId: string) {
        const state = store.state;
        if (state.status === "idle" || state.status === "running") {
          return;
        }
        const accepted = acceptToolCall(
          createEditor,
          state.review.proposal,
          toolCallId,
        );
        if (accepted.error !== undefined) {
          return;
        }
        clearSuggestions(editor);
        const result = updateDocument(editor, accepted.change);
        if (result.error !== undefined) {
          throw new Error(`The accept of a tool call failed: ${result.error}`);
        }
        const proposal = withBatch(state.review.proposal, accepted.batch);
        setProposal(proposal);
        record([toolCallId], "accepted");
        options?.onReview?.(accepted.batch, proposal);
        closeIfDone();
      },

      /**
       * Rejects the changes of one tool call: a write to the proposal that
       * reverts them. The other suggestions stay.
       */
      rejectToolCall(toolCallId: string) {
        const state = store.state;
        if (state.status === "idle" || state.status === "running") {
          return;
        }
        const reverted = revertToolCall(
          createEditor,
          state.review.proposal,
          toolCallId,
        );
        if (reverted.error !== undefined) {
          return;
        }
        const proposal = withBatch(state.review.proposal, reverted.batch);
        setProposal(proposal);
        record([toolCallId], "rejected");
        options?.onReview?.(reverted.batch, proposal);
        closeIfDone();
      },
    } as const;
  },
);

/** The batches in the output of a tool call or in a data chunk, or no batches for other data. */
function batchesOf(output: unknown): Batch[] {
  if (typeof output !== "object" || output === null) {
    return [];
  }
  const batches: unknown = (output as { batches?: unknown }).batches;
  return Array.isArray(batches) ? (batches as Batch[]) : [];
}
