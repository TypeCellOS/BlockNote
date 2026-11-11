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
import { DOCUMENT_BATCHES_CHUNK } from "../agent/earlyToolCalls.js";
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
 * - `idle`: no proposal.
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
    let chat: Chat<UIMessage> | undefined;
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

    /** Handles one chunk of the UI message stream of a run. */
    function onChunk(chunk: UIMessageChunk) {
      const state = store.state;
      if (state.status !== "running") {
        return;
      }
      if (chunk.type === "tool-output-available") {
        applyBatches(batchesOf(chunk.output));
      } else if (chunk.type === DOCUMENT_BATCHES_CHUNK) {
        applyBatches(batchesOf(chunk.data));
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

    /** Ends the review: the editor shows the main document, without a proposal. */
    function reset() {
      const running = chat;
      chat = undefined;
      newest = new Set();
      void running?.stop();
      store.setState({ status: "idle" });
      clearSuggestions(editor);
      aiMenu()?.closeAIMenu();
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
       * proposal in review.
       */
      async invoke(prompt: string) {
        const transport = options?.transport;
        if (transport === undefined) {
          throw new Error("The document agent has no transport");
        }
        const state = store.state;
        if (state.status === "running") {
          return;
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
        aiMenu()?.setAIResponseStatus("thinking");

        chat ??= new Chat<UIMessage>({
          transport: observeTransport(transport, onChunk),
        });
        const current = chat;
        const body: DocumentAgentRequestBody = { proposal: review.proposal };
        await current.sendMessage(
          { role: "user", parts: [{ type: "text", text: prompt }] },
          { body },
        );

        const after = store.state;
        if (after.status !== "running" || chat !== current) {
          // The run failed, or the user closed the review.
          return;
        }
        if (current.status === "error") {
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
      },

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
        const shown = display(proposal);
        const { toolCalls } = shown;
        const answer =
          store.state.status === "idle" ? "" : store.state.review.answer;
        store.setState({
          status: "reviewing",
          review: { proposal, ...shown, answer },
        });
        // The AI menu has the items that accept and reject the proposal.
        const ai = aiMenu();
        if (ai !== undefined && ai.store.state.aiMenuState === "closed") {
          // The menu opens below a block: use the last block with a
          // suggestion, as the menu of a run that a user starts.
          const block =
            toolCalls.flatMap((call) => call.suggestedBlockIds).at(-1) ??
            editor.document.at(-1)?.id;
          if (block !== undefined && editor.getBlock(block)) {
            ai.openAIMenuAtBlock(block);
            ai.setAIResponseStatus("user-reviewing");
          }
        }
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
        reset();
        options?.onClose?.("accepted", proposal);
      },

      /** Rejects the full proposal: it goes, and the document does not change. */
      rejectAll() {
        const state = store.state;
        if (state.status === "idle") {
          return;
        }
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
