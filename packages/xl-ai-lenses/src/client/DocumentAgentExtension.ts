import type { UIMessageChunk } from "ai";
import type { Node } from "prosemirror-model";
import { Plugin, PluginKey, type Transaction } from "prosemirror-state";

import {
  DOCUMENT_BATCHES_CHUNK,
  DOCUMENT_PROPOSAL_CHUNK,
} from "../proposal/chunks.js";
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
import {
  type AgentExtensionOptions,
  type AgentState,
  type ClientMode,
  createAgentExtension,
  type ModeContext,
  type ReviewOf,
} from "./agentExtension.js";
import { createReplayPlugin, type ReplayChange } from "./replayAnimation.js";
import {
  assertNoSuggestions,
  clearSuggestions,
  DISPLAY_META,
  hasSuggestions,
  mainDocumentOf,
  showSuggestions,
} from "./suggestions.js";
import type { DocumentAgentRequestBody } from "./transport.js";

// The proposal mode of the document agent in an editor. The chat, the runs
// and the states are the shared code of `agentExtension.ts`. This file has
// the review of this mode: the client keeps a copy of the proposal, shows
// it as suggestions, and applies the decisions of the user to the main
// document.

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

/** The data of a review in proposal mode: the proposal, and what the display shows of it. */
export type ProposalReviewData = {
  proposal: Proposal;
  toolCalls: ReviewToolCall[];
  /** The number of operations that the display shows as suggestions. */
  suggestionCount: number;
};

/** A proposal in review: the proposal, its tool calls, and the last answer of the agent. */
export type Review = ReviewOf<ProposalReviewData>;

/**
 * The state of the document agent in an editor, in proposal mode (see
 * `AgentState`).
 *
 * - `idle`: no proposal. The document of the editor has no suggestion
 *   marks: it is the main document. In the other states, it can have
 *   suggestion marks, and an app must not save it as the main document.
 *   An app that saves the main document uses `mainDocument()`: it is safe
 *   in each state. The display of a proposal does not tell
 *   `editor.onChange`: an app gets a change only for a change of the main
 *   document (an edit of a user, or an accept).
 * - `running`: the agent works. The display shows each batch when its tool
 *   call is complete.
 * - `reviewing`: the user accepts or rejects.
 * - `error`: the request failed, or the proposal of this client is not the
 *   proposal of the host (`out-of-sync`). The review stays, thus the user
 *   can accept or reject what arrived.
 */
export type DocumentAgentState = AgentState<ProposalReviewData>;

/**
 * An accept that a user asks for: of one tool call (with the `accept` batch
 * of that call, and the proposal with that batch), or of the full proposal.
 */
export type AcceptClaim =
  | { type: "tool-call"; batch: Batch; proposal: Proposal }
  | { type: "proposal"; proposal: Proposal };

export type DocumentAgentExtensionOptions = AgentExtensionOptions & {
  /**
   * Called after a user accepts or rejects one tool call. A host that keeps
   * the proposal in a store saves the batch there.
   */
  onReview?: (batch: Batch, proposal: Proposal) => void;
  /** Called after a user accepts or rejects the full proposal. */
  onClose?: (result: "accepted" | "rejected", proposal: Proposal) => void;
  /**
   * An optional guard for an accept, for a proposal that more than one
   * user can review.
   *
   * Without it (the base scenario), an accept writes to the main document
   * at once. This is simple, and it has a known risk: an accept is a write
   * of one user. If two users accept the same change before their editors
   * sync, the shared document gets the text two times (see the test
   * "KNOWN: two users who accept one proposal at the same time").
   *
   * With it, the extension asks first, and writes only if the function
   * resolves to true. A host that keeps the proposal gives one order to
   * the accepts: the first claim for a state of the proposal gets true (a
   * compare and swap), and each other claim gets false. The costs: an
   * accept waits for the host, and an editor that stops between the claim
   * and the write leaves an accept that the host has and the document does
   * not have.
   *
   * The host has the accept from the claim. Thus, with a guard, the
   * extension does not call `onReview` for an accept, and not `onClose`
   * for the accept of the full proposal.
   */
  acceptGuard?: (claim: AcceptClaim) => Promise<boolean>;
  /** Called when `acceptGuard` refused an accept: the app gets the proposal of the host again. */
  onAcceptRefused?: (claim: AcceptClaim) => void;
};

/** The elements of the suggestion marks of `AIExtension` in the editor. */
const SUGGESTION_ELEMENTS = 'ins, del, [data-type="modification"]';

/** The kind of change that each suggestion mark of `AIExtension` shows. */
const SUGGESTION_KINDS: Record<string, ReplayChange["kind"] | undefined> = {
  insertion: "insert",
  deletion: "delete",
  modification: "modify",
};

/**
 * The document agent in an editor, in proposal mode: it sends the prompts
 * of the user (the shared code of `agentExtension.ts`), keeps the copy of
 * the proposal of this client, shows the proposal as suggestions, and
 * applies the review of the user.
 *
 * A run that a user starts sends a prompt with `invoke`. A run that a
 * server starts gives its proposal to `openProposal`. The display and the
 * accept are the same.
 *
 * The extension needs `AIExtension` in the same editor: that extension has
 * the suggestion marks and the state of the AI menu.
 */
export const DocumentAgentExtension = createAgentExtension(createProposalMode);

/** The functions of the extension that only the proposal mode has. */
type ProposalModeApi = {
  /**
   * Opens a proposal that a host made, for example in a run that a server
   * started. The display and the review are the same as for a run of this
   * client. A later call with a newer version of the proposal replaces the
   * display.
   */
  openProposal(proposal: Proposal): void;
};

/** The review of the proposal mode in an editor (see `ClientMode`). */
function createProposalMode(
  context: ModeContext<ProposalReviewData>,
  options: DocumentAgentExtensionOptions | undefined,
): ClientMode<ProposalReviewData, ProposalModeApi> {
  const { editor, store, aiMenu, fail, reset, record, lockEditor } = context;
  const createEditor = headlessEditorFactory({ schema: editor.schema });
  /** True while `acceptGuard` decides on an accept. */
  let claiming = false;

  /**
   * Runs the write of an accept to the main document.
   *
   * The base scenario: no guard, and the write runs at once. With
   * `acceptGuard`, the write runs only after the guard agreed (see
   * `DocumentAgentExtensionOptions.acceptGuard`). The write uses the data
   * of the claim, not the state of that later time: the review can
   * change while the guard decides.
   */
  function writeAccept(claim: AcceptClaim, write: () => void) {
    const guard = options?.acceptGuard;
    if (guard === undefined) {
      write();
      return;
    }
    if (claiming) {
      // One claim at a time: the answer of the host decides the next one.
      return;
    }
    claiming = true;
    void guard(claim).then(
      (granted) => {
        claiming = false;
        if (granted) {
          write();
        } else {
          options?.onAcceptRefused?.(claim);
        }
      },
      (error: unknown) => {
        claiming = false;
        throw error;
      },
    );
  }

  /**
   * The suggestion IDs of the tool calls that arrived in the run, and
   * whose replay animation is not complete.
   */
  const animated = new Set<number>();

  /** The change that a node shows, if it is a change of a tool call of the run. */
  function changeOf(node: Node): ReplayChange | undefined {
    for (const mark of node.marks) {
      const kind = SUGGESTION_KINDS[mark.type.name];
      const id: unknown = mark.attrs.id;
      if (kind !== undefined && typeof id === "number" && animated.has(id)) {
        return { kind, key: String(id) };
      }
    }
    return undefined;
  }

  const replay = createReplayPlugin({
    changeOf,
    onComplete(keys) {
      for (const key of keys) {
        animated.delete(Number(key));
      }
    },
  });

  /** Derives the suggestions of the proposal for the current document, and shows them. */
  function display(
    proposal: Proposal,
  ): Pick<Review, "toolCalls" | "suggestionCount"> {
    clearSuggestions(editor);
    assertNoSuggestions(editor, "The display of a proposal");
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
    for (const batch of fresh) {
      if (batch.source.type === "tool-call") {
        animated.add(suggestionIdOf(batch));
      }
    }
    setProposal(proposal);
  }

  /**
   * Takes the proposal that a host sends at the start of a run as the
   * copy of this client. A host that keeps the proposal sends it: the
   * proposal can have batches that this client does not have.
   */
  function adoptProposal(data: unknown) {
    const proposal: unknown = (data as { proposal?: unknown } | null)?.proposal;
    if (
      !isProposalShape(proposal) ||
      replayProposal(createEditor, proposal).error !== undefined
    ) {
      fail("out-of-sync");
      return;
    }
    setProposal(proposal);
  }

  /** Handles the chunks of the stream of a run that have the proposal or its batches. */
  function onChunk(chunk: UIMessageChunk) {
    if (chunk.type === "tool-output-available") {
      applyBatches(batchesOf(chunk.output));
    } else if (chunk.type === DOCUMENT_BATCHES_CHUNK) {
      applyBatches(batchesOf(chunk.data));
    } else if (chunk.type === DOCUMENT_PROPOSAL_CHUNK) {
      adoptProposal(chunk.data);
    }
  }

  /** The tool calls of a review that have no decision of the user. */
  function openToolCallIds(review: Review): string[] {
    return review.toolCalls
      .filter((call) => call.state === "open")
      .map((call) => call.toolCallId);
  }

  /**
   * Removes the suggestions of the proposal from the editor: the editor
   * shows the main document. The suggestion marks go before the state is
   * `idle` (see `openProposal`).
   */
  function hide() {
    animated.clear();
    replay.stop();
    clearSuggestions(editor);
    assertNoSuggestions(editor, "The end of a review");
  }

  /** The data of a new review: a new proposal of the current document. */
  function startReview(): ProposalReviewData {
    // The document of the editor becomes the origin of a proposal.
    assertNoSuggestions(editor, "The start of a proposal");
    return {
      proposal: createProposal(editor.document),
      toolCalls: [],
      suggestionCount: 0,
    };
  }

  /** The tool calls of the review of the state, or no tool calls in the state `idle`. */
  function reviewedToolCalls(): ReviewToolCall[] {
    const state = store.state;
    return state.status === "idle" ? [] : state.review.toolCalls;
  }

  /**
   * The selector of the suggestion marks of a tool call. Each mark has the
   * ID of the tool call as `data-id` (see `suggestionIdOf`). A tool call
   * that the review does not have gets a selector that finds nothing.
   */
  function suggestionSelector(toolCallId: string): string {
    const call = reviewedToolCalls().find(
      (item) => item.toolCallId === toolCallId,
    );
    const id = `[data-id="${call === undefined ? "" : suggestionIdOf(call)}"]`;
    return `ins${id}, del${id}, [data-type="modification"]${id}`;
  }

  function toolCallOfElement(element: Element): string | undefined {
    const mark = element.closest(SUGGESTION_ELEMENTS);
    const id = Number(mark?.getAttribute("data-id"));
    return mark === null || Number.isNaN(id)
      ? undefined
      : reviewedToolCalls().find((call) => suggestionIdOf(call) === id)
          ?.toolCallId;
  }

  /** One line on the blocks that the editor shows for an open tool call. */
  function describeToolCall(toolCallId: string): string | undefined {
    const call = reviewedToolCalls().find(
      (item) => item.toolCallId === toolCallId,
    );
    if (call === undefined || call.state !== "open") {
      return undefined;
    }
    const blocks = call.suggestedBlockIds.length;
    const shared = call.sharedBlockIds.length;
    if (blocks === 0) {
      return shared > 0
        ? "A later change shows the blocks of this change."
        : "No change is left to show.";
    }
    return `${blocks} block${blocks === 1 ? "" : "s"}${
      shared > 0 ? `, ${shared} with another change` : ""
    }`;
  }

  /**
   * The replay animation shows only the tool calls of the run that starts.
   * The animation of a run continues after the end of the run, to its own
   * end: the last tool call of a run arrives a short time before the run
   * ends.
   */
  function beginRun() {
    animated.clear();
    replay.stop();
  }

  return {
    // The suggestions of a proposal are marks in the document of the
    // editor, or in a local fork of its Y.Doc: an edit of a user there
    // would not be an edit of the main document.
    locksEditor: true,
    startReview,
    beginRun,
    onChunk,
    requestBody: (review): DocumentAgentRequestBody => ({
      proposal: review.proposal,
    }),
    hide,
    suggestionSelector,
    toolCallOfElement,
    describeToolCall,
    prosemirrorPlugins: [
      new Plugin({
        key: new PluginKey("blocknote-document-agent"),
        // A guard for the main document. While the document of the editor
        // itself has the suggestions of a proposal, only the display can
        // change it. A different change (of an app, or of an extension)
        // would change text that is not in the main document, and tell
        // `editor.onChange` about a document with suggestion marks. It
        // throws: the transaction does not apply.
        //
        // An editor that is bound to a Y.Doc does not need this guard:
        // there, the suggestions are in a local fork, and the shared
        // Y.Doc is the main document (see `showSuggestions`).
        filterTransaction(tr, state) {
          if (
            !tr.docChanged ||
            store.state.status === "idle" ||
            editor.getExtension("ySync") !== undefined
          ) {
            return true;
          }
          const root: Transaction = tr.getMeta("appendedTransaction") ?? tr;
          if (
            root.getMeta(DISPLAY_META) === true ||
            !hasSuggestions(state.doc)
          ) {
            return true;
          }
          throw new Error(
            "The editor shows a proposal as suggestions: its document cannot change. Accept or reject the proposal first.",
          );
        },
        props: {
          // The style sheet gives the suggestions of a proposal a color.
          attributes: (): Record<string, string> =>
            store.state.status === "idle"
              ? {}
              : { "data-agent-proposal": "true" },
        },
      }),
      ...(options?.replayAnimation === false ? [] : [replay.plugin]),
    ],
    /**
     * The main document of the editor: the document without the
     * suggestions of a proposal, in each state (see `mainDocumentOf`).
     * An app saves this document, never `editor.document`.
     */
    mainDocument() {
      return mainDocumentOf(editor);
    },

    api: {
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
      const { review } = state;
      const { proposal } = review;
      writeAccept({ type: "proposal", proposal }, () => {
        clearSuggestions(editor);
        assertNoSuggestions(editor, "The accept of a proposal");
        const result = updateDocument(
          editor,
          acceptAllChange(createEditor, proposal),
        );
        if (result.error !== undefined) {
          // The proposal document comes from an editor with this schema.
          throw new Error(`The accept of a proposal failed: ${result.error}`);
        }
        record(openToolCallIds(review), "accepted");
        reset();
        if (options?.acceptGuard === undefined) {
          options?.onClose?.("accepted", proposal);
        }
      });
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
      const { batch, change } = accepted;
      const proposal = withBatch(state.review.proposal, batch);
      writeAccept({ type: "tool-call", batch, proposal }, () => {
        clearSuggestions(editor);
        assertNoSuggestions(editor, "The accept of a tool call");
        const result = updateDocument(editor, change);
        if (result.error !== undefined) {
          throw new Error(`The accept of a tool call failed: ${result.error}`);
        }
        // With a guard, the review can have a newer proposal of the host
        // at this time, which already has the batch.
        const current = store.state;
        if (current.status !== "idle") {
          const known = current.review.proposal.batches[batch.seq - 1];
          setProposal(
            known?.hash === batch.hash ? current.review.proposal : proposal,
          );
        }
        record([toolCallId], "accepted");
        if (options?.acceptGuard === undefined) {
          options?.onReview?.(batch, proposal);
        }
        closeIfDone();
      });
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
  };
}

/** The batches in the output of a tool call or in a data chunk, or no batches for other data. */
function batchesOf(output: unknown): Batch[] {
  if (typeof output !== "object" || output === null) {
    return [];
  }
  const batches: unknown = (output as { batches?: unknown }).batches;
  return Array.isArray(batches) ? (batches as Batch[]) : [];
}
