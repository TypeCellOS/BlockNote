import { generateId, type UIMessage, type UIMessageChunk } from "ai";

import type { LensBlock } from "../../api/v2/index.js";
import {
  type DocumentAgentOptions,
  streamDocumentAgentOnHandle,
} from "../agent/documentAgent.js";
import {
  DOCUMENT_PROPOSAL_CHUNK,
  type DocumentProposalData,
} from "../agent/earlyToolCalls.js";
import { type CreateEditor, createProposal } from "../proposal/proposal.js";
import type { Batch, Proposal } from "../proposal/types.js";
import type { ProposalStore } from "../stores/proposalStore.js";
import { createDocumentHandle } from "../tools/handle.js";
import { createRunLog, type RunLog } from "./runLog.js";

/**
 * Who started a run: a user in the chat of an editor, or a caller outside
 * the editors (a script, a schedule, or later an external agent).
 */
export type RunOrigin = "user" | "external";

/** The metadata of a message of the chat of a session that starts a run. */
export type SessionMessageMetadata = { origin: RunOrigin };

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
 * same stream of a run (see `RunLog.follow`).
 */
export type SessionHost = {
  snapshot(documentId: string): Promise<SessionSnapshot>;
  /**
   * Starts a run for a request. The request becomes a message of the chat.
   * The run writes to the open proposal of the document, or to a new
   * proposal of the current main document.
   */
  startRun(
    documentId: string,
    request: { prompt: string; origin: RunOrigin; messageId?: string },
  ): Promise<
    | { error?: undefined; run: RunLog }
    /** A document has one run at a time. */
    | { error: "run-active" }
    | { error: "unknown-document" }
  >;
  /** The run in progress of the document. */
  activeRun(documentId: string): RunLog | undefined;
  /** Stops the run in progress. The batches that it wrote stay. */
  stopRun(documentId: string): void;
  /**
   * Adds the batch of a review of a user to the proposal: the accept or
   * the reject of one tool call. The batch must follow the stored
   * proposal. Else, the client gets the snapshot again.
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
   * Closes the proposal of the document: a user accepted or rejected all
   * of it. The next run starts a new proposal. The chat stays.
   */
  closeProposal(documentId: string): void;
};

type Session = {
  messages: UIMessage[];
  proposalId: string | undefined;
  run: { log: RunLog; abort: AbortController } | undefined;
};

/**
 * Makes the sessions of a host. The chats and the runs are in memory: this
 * is sufficient for one process. A production host keeps the chats in a
 * database, and the streams of the runs in a store that all its processes
 * can read.
 */
export function createSessionHost(options: SessionHostOptions): SessionHost {
  const { proposals, createEditor } = options;
  const sessions = new Map<string, Session>();

  function sessionOf(documentId: string): Session {
    let session = sessions.get(documentId);
    if (session === undefined) {
      session = { messages: [], proposalId: undefined, run: undefined };
      sessions.set(documentId, session);
    }
    return session;
  }

  function activeRun(documentId: string): RunLog | undefined {
    const log = sessions.get(documentId)?.run?.log;
    return log === undefined || log.isDone() ? undefined : log;
  }

  return {
    activeRun,

    async snapshot(documentId) {
      const session = sessionOf(documentId);
      return {
        messages: session.messages,
        proposal:
          session.proposalId === undefined
            ? undefined
            : await proposals.load(session.proposalId),
        activeRunId: activeRun(documentId)?.id,
      };
    },

    async startRun(documentId, request) {
      const session = sessionOf(documentId);
      if (activeRun(documentId) !== undefined) {
        return { error: "run-active" };
      }
      const main = await options.readMain(documentId);
      if (main === undefined) {
        return { error: "unknown-document" };
      }
      // The same check again: the read of the main document takes time, and
      // a second request can come in that time.
      if (activeRun(documentId) !== undefined) {
        return { error: "run-active" };
      }
      if (session.proposalId === undefined) {
        session.proposalId = generateId();
        await proposals.save(session.proposalId, createProposal(main));
      }
      const { proposalId } = session;
      const proposal = await proposals.load(proposalId);
      if (proposal === undefined) {
        throw new Error(`The store has no proposal ${proposalId}`);
      }

      const metadata: SessionMessageMetadata = { origin: request.origin };
      session.messages = [
        ...session.messages,
        {
          id: request.messageId ?? generateId(),
          role: "user",
          metadata,
          parts: [{ type: "text", text: request.prompt }],
        },
      ];
      // The handle rebases the proposal onto the main document before each
      // tool call: the users can change the document while the agent works.
      const handle = createDocumentHandle({
        store: proposals,
        proposalId,
        createEditor,
        readMain: () => options.readMain(documentId),
      });
      const abort = new AbortController();
      const log = createRunLog(
        generateId(),
        withProposalChunk(
          await streamDocumentAgentOnHandle(handle, session.messages, {
            ...options,
            abortSignal: abort.signal,
            onEnd(responseMessage) {
              session.messages = [...session.messages, responseMessage];
            },
          }),
          proposal,
        ),
      );
      session.run = { log, abort };
      options.onChange?.(documentId);
      log.done.then(
        () => options.onChange?.(documentId),
        (error: unknown) => {
          options.onRunError?.(documentId, error);
          options.onChange?.(documentId);
        },
      );
      return { run: log };
    },

    stopRun(documentId) {
      const run = sessions.get(documentId)?.run;
      if (run !== undefined && !run.log.isDone()) {
        run.abort.abort();
      }
    },

    async review(documentId, batch) {
      const { proposalId } = sessionOf(documentId);
      const proposal =
        proposalId === undefined ? undefined : await proposals.load(proposalId);
      if (proposalId === undefined || proposal === undefined) {
        return { error: "no-proposal" };
      }
      if (batch.seq !== proposal.batches.length + 1) {
        return { error: "stale", batches: proposal.batches.length };
      }
      await proposals.save(proposalId, {
        origin: proposal.origin,
        batches: [...proposal.batches, batch],
      });
      options.onChange?.(documentId);
      return {};
    },

    closeProposal(documentId) {
      const session = sessionOf(documentId);
      if (session.proposalId !== undefined) {
        session.proposalId = undefined;
        options.onChange?.(documentId);
      }
    },
  };
}

/**
 * Returns the stream of a run with the proposal at the start of the run,
 * as a transient chunk after the first chunk of the stream. A client takes
 * this proposal as its copy, and applies the batches of the run to it.
 */
function withProposalChunk(
  source: ReadableStream<UIMessageChunk>,
  proposal: Proposal,
): ReadableStream<UIMessageChunk> {
  let sent = false;
  return source.pipeThrough(
    new TransformStream<UIMessageChunk, UIMessageChunk>({
      transform(chunk, controller) {
        controller.enqueue(chunk);
        if (!sent) {
          sent = true;
          const data: DocumentProposalData = { proposal };
          controller.enqueue({
            type: DOCUMENT_PROPOSAL_CHUNK,
            data,
            transient: true,
          });
        }
      },
    }),
  );
}
