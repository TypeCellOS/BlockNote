import type { UIMessage } from "ai";

import type { LensBlock } from "../../api/v2/index.js";
import { recordReview } from "../agent/chatReview.js";
import type { DocumentAgentOptions } from "../agent/documentAgent.js";
import {
  batchesChunk,
  DOCUMENT_PROPOSAL_CHUNK,
  type DocumentProposalData,
} from "../proposal/chunks.js";
import { toolCallsOf } from "../proposal/derive.js";
import {
  batchFollows,
  type CreateEditor,
  createProposal,
} from "../proposal/proposal.js";
import {
  createProposalDocument,
  type ProposalExtra,
} from "../proposal/proposalDocument.js";
import type { Batch, Proposal } from "../proposal/types.js";
import type { ChatStore } from "../stores/chatStore.js";
import type { ProposalStore } from "../stores/proposalStore.js";
import type { RunStore } from "../stores/runStore.js";
import type { ToolCallReview } from "../tools/documentTools.js";
import { type ChatSessions, createChatSessions } from "./chatSessions.js";

export type { RunOrigin, SessionMessageMetadata } from "./chatSessions.js";

/** The state of the session of a document, for a client that opens it. */
export type SessionSnapshot = {
  /** The chat of the document: each request, and each message of the agent. */
  messages: UIMessage[];
  /** The open proposal of the document. */
  proposal: Proposal | undefined;
  /** The run in progress. A client follows it (see `SessionHost.activeRun`). */
  activeRunId: string | undefined;
};

export type SessionHostOptions = DocumentAgentOptions & {
  /** Makes a headless editor with the schema of the app. */
  createEditor: CreateEditor;
  proposals: ProposalStore;
  /**
   * The store of the chats. The default is a store in the memory of this
   * process (see `ChatStore`).
   */
  chats?: ChatStore;
  /**
   * The store of the streams of the runs. The default is a store in the
   * memory of this process (see `RunStore`).
   */
  runs?: RunStore;
  /** Reads the main document, or `undefined` if it does not exist. */
  readMain(documentId: string): Promise<LensBlock[] | undefined>;
  /**
   * Called when the session of a document changed: a run started or ended,
   * or a review of a user changed or closed the proposal. A host tells the
   * editors of the document. An editor then gets the snapshot.
   */
  onChange?(documentId: string): void;
  /** Called when the stream of a run failed. This is a bug or an outage. */
  onRunError?(documentId: string, error: unknown): void;
};

/**
 * The sessions of the documents of a host that keeps the proposals.
 *
 * A session is the chat of one document, its open proposal, and its run in
 * progress. A document has one open proposal, as one open pull request.
 * Each run writes to it: a run that a user starts in the chat, and a run
 * that a caller outside the editors starts. The two use {@link startRun}:
 * the only difference is the origin in the message of the chat.
 *
 * Each editor of the document shows the same proposal, and follows the
 * same stream of a run (see `Run.follow`).
 */
export type SessionHost = {
  snapshot(documentId: string): Promise<SessionSnapshot>;
  /**
   * Starts a run for a request. The request becomes a message of the chat.
   * The run writes to the open proposal of the document, or to a new
   * proposal of the current main document.
   */
  startRun: ChatSessions["startRun"];
  /** The run in progress of the document. */
  activeRun: ChatSessions["activeRun"];
  /** Stops the run in progress. The batches that it wrote stay. */
  stopRun: ChatSessions["stopRun"];
  /**
   * Adds the batch of a review of a user to the proposal: the accept or
   * the reject of one tool call. The batch must follow the stored
   * proposal (its number, its operations and its hash, see
   * `batchFollows`). Else, the client gets the snapshot again.
   */
  review(
    documentId: string,
    batch: Batch,
  ): Promise<
    | { error?: undefined }
    | { error: "no-proposal" }
    | { error: "stale"; batches: number }
  >;
  /**
   * Closes the proposal of the document: a user accepted or rejected the
   * tool calls that had no decision (`result`). The next run starts a new
   * proposal. The chat stays, with the decisions of the user in the outputs
   * of its tool calls (see `recordReview`): the agent gets them in its
   * next run.
   *
   * With `expectedBatches`, the close is a claim: it applies only if the
   * document has an open proposal with that number of batches (a compare
   * and swap). An editor that accepts the full proposal sends the number
   * of batches of its copy. Thus, only the first of two editors that
   * accept the same state of the proposal gets the close, and the other
   * one does not write (see `acceptGuard` of the extension).
   */
  closeProposal(
    documentId: string,
    result: ToolCallReview,
    expectedBatches?: number,
  ): Promise<{ error?: undefined } | { error: "stale" }>;
};

/**
 * Makes the sessions of a host in proposal mode. The chats and the runs
 * are the shared code of `chatSessions.ts`. This function adds the open
 * proposal of each document, and the review of a user.
 *
 * The host keeps no state of a document in the memory of the process: the
 * chat, the streams of the runs and the proposals are in the stores. One
 * exception is the order of the review requests of a document, which is
 * for one process (see `inOrder`).
 */
export function createSessionHost(options: SessionHostOptions): SessionHost {
  const { proposals, createEditor } = options;

  /**
   * The ID of the open proposal of a document in the proposal store. A
   * document has one open proposal: the store has it, or the document has
   * none.
   */
  function proposalIdOf(documentId: string) {
    return `session:${documentId}`;
  }

  const chats = createChatSessions<ProposalExtra>({
    ...options,
    async openRun(documentId) {
      const main = await options.readMain(documentId);
      if (main === undefined) {
        return undefined;
      }
      const proposalId = proposalIdOf(documentId);
      let proposal = await proposals.load(proposalId);
      if (proposal === undefined) {
        proposal = createProposal(main);
        await proposals.save(proposalId, proposal);
      }
      // A client takes the proposal at the start of the run as its copy,
      // and applies the batches of the run to it.
      const data: DocumentProposalData = { proposal };
      return {
        // The document rebases the proposal onto the main document before
        // each tool call: the users can change the document while the
        // agent works.
        document: createProposalDocument({
          store: proposals,
          proposalId,
          createEditor,
          readMain: () => options.readMain(documentId),
        }),
        extraChunk: batchesChunk,
        openingChunk: { type: DOCUMENT_PROPOSAL_CHUNK, data, transient: true },
      };
    },
  });

  /** The end of the last review request of each document. */
  const reviews = new Map<string, Promise<unknown>>();

  /**
   * Runs the review requests of one document one after the other. A
   * request reads the proposal, examines it, and writes it: two requests
   * that run together would both pass the check. This is the one order of
   * the accepts of a document (in one process).
   */
  function inOrder<T>(documentId: string, task: () => Promise<T>): Promise<T> {
    const run = (reviews.get(documentId) ?? Promise.resolve()).then(task);
    // A request that throws must not stop the requests after it.
    reviews.set(
      documentId,
      run.catch(() => undefined),
    );
    return run;
  }

  /** Puts the decisions of a user into the outputs of the tool calls in the chat. */
  function record(
    documentId: string,
    decisions: ReadonlyMap<string, ToolCallReview>,
  ) {
    return chats.updateMessages(documentId, (messages) =>
      recordReview(messages, decisions),
    );
  }

  async function openProposalOf(documentId: string) {
    const proposalId = proposalIdOf(documentId);
    return { proposalId, proposal: await proposals.load(proposalId) };
  }

  return {
    startRun: (documentId, request) => chats.startRun(documentId, request),
    activeRun: (documentId) => chats.activeRun(documentId),
    stopRun: (documentId) => chats.stopRun(documentId),

    async snapshot(documentId) {
      // The run first: a run whose process stopped ends in the chat here.
      const run = await chats.activeRun(documentId);
      return {
        messages: await chats.messages(documentId),
        proposal: (await openProposalOf(documentId)).proposal,
        activeRunId: run?.id,
      };
    },

    review(documentId, batch) {
      return inOrder(documentId, async () => {
        const { proposalId, proposal } = await openProposalOf(documentId);
        if (proposal === undefined) {
          return { error: "no-proposal" as const };
        }
        // The batch must be for this history of the proposal: the number
        // alone can be correct by chance (see `batchFollows`).
        if (!batchFollows(createEditor, proposal, batch)) {
          return { error: "stale" as const, batches: proposal.batches.length };
        }
        await proposals.save(proposalId, {
          origin: proposal.origin,
          batches: [...proposal.batches, batch],
        });
        const { source } = batch;
        if (source.type === "accept" || source.type === "revert") {
          await record(
            documentId,
            new Map([
              [
                source.toolCallId,
                source.type === "accept" ? "accepted" : "rejected",
              ],
            ]),
          );
        }
        options.onChange?.(documentId);
        return {};
      });
    },

    closeProposal(documentId, result, expectedBatches) {
      return inOrder(documentId, async () => {
        const { proposalId, proposal } = await openProposalOf(documentId);
        if (
          expectedBatches !== undefined &&
          proposal?.batches.length !== expectedBatches
        ) {
          return { error: "stale" as const };
        }
        if (proposal === undefined) {
          // A close without a claim, of a proposal that is closed.
          return {};
        }
        await record(
          documentId,
          new Map(
            toolCallsOf(proposal)
              .filter((call) => call.state === "open")
              .map((call) => [call.toolCallId, result]),
          ),
        );
        await proposals.delete(proposalId);
        options.onChange?.(documentId);
        return {};
      });
    },
  };
}
