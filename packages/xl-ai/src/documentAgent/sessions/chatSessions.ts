import { generateId, type UIMessage, type UIMessageChunk } from "ai";

import {
  type DocumentAgentOptions,
  streamAgentOnDocument,
} from "../agent/documentAgent.js";
import {
  type ChatStore,
  createInMemoryChatStore,
} from "../stores/chatStore.js";
import type { AgentDocument } from "../tools/agentDocument.js";
import { createRunLog, type RunLog } from "./runLog.js";

/**
 * Who started a run: a user in the chat of an editor, or a caller outside
 * the editors (a script, a schedule, or later an external agent).
 */
export type RunOrigin = "user" | "external";

/** The metadata of a message of the chat of a session that starts a run. */
export type SessionMessageMetadata = { origin: RunOrigin };

/** What a mode gives for one run of the agent on a document. */
export type RunDocument<Extra extends object> = {
  /** The document of the agent for the run. */
  document: AgentDocument<Extra>;
  /**
   * Makes a stream chunk from the extra data of a step, for a client that
   * follows the run (see `streamAgentOnDocument`).
   */
  extraChunk?: (
    extra: Extra,
    toolCallId?: string,
  ) => UIMessageChunk | undefined;
  /**
   * A chunk for the start of the stream of the run, after the first chunk
   * of the stream (for example the proposal of the run).
   */
  openingChunk?: UIMessageChunk;
  /** Called at the end of the run. */
  close?(): void;
};

export type ChatSessionsOptions<Extra extends object> = DocumentAgentOptions & {
  /**
   * Opens the document of the agent for a run, or gives `undefined` if
   * the host does not have the document. This is where the modes of a
   * host are different.
   */
  openRun(documentId: string): Promise<RunDocument<Extra> | undefined>;
  /**
   * The store of the chats. The default is a store in the memory of this
   * process (see `ChatStore`).
   */
  chats?: ChatStore;
  /** Called when the session of a document changed: a run started or ended. */
  onChange?(documentId: string): void;
  /** Called when the stream of a run failed. This is a bug or an outage. */
  onRunError?(documentId: string, error: unknown): void;
};

/**
 * The chats and the runs of the documents of a host, for each mode of the
 * document agent. A document has one chat, and one run at a time. Each run
 * starts with {@link startRun}: a run that a user starts in the chat, and
 * a run that a caller outside the editors starts. The only difference is
 * the origin in the message of the chat.
 *
 * Each editor of the document follows the same stream of a run (see
 * `RunLog.follow`).
 */
export type ChatSessions = {
  /** The chat of the document: each request, and each message of the agent. */
  messages(documentId: string): Promise<UIMessage[]>;
  /**
   * Changes the chat of the document. A mode uses this to put the decision
   * of a user into the output of a tool call (see `recordReview`).
   */
  updateMessages(
    documentId: string,
    change: (messages: UIMessage[]) => UIMessage[],
  ): Promise<void>;
  /** Starts a run for a request. The request becomes a message of the chat. */
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
  /** Stops the run in progress. The changes that it wrote stay. */
  stopRun(documentId: string): void;
};

type Session = {
  /** The save of the last message of the agent to the chat store. */
  saved: Promise<unknown>;
  /** True from the request for a run to the start of its stream. */
  starting: boolean;
  run: { log: RunLog; abort: AbortController } | undefined;
};

/**
 * Makes the chats and the runs of a host. The chats are in a store (see
 * `ChatStore`). The runs are in the memory of this process: a production
 * host with more than one process needs the streams of the runs in a store
 * that all its processes can read.
 */
export function createChatSessions<Extra extends object>(
  options: ChatSessionsOptions<Extra>,
): ChatSessions {
  const chats = options.chats ?? createInMemoryChatStore();
  const sessions = new Map<string, Session>();

  function sessionOf(documentId: string): Session {
    let session = sessions.get(documentId);
    if (session === undefined) {
      session = { saved: Promise.resolve(), starting: false, run: undefined };
      sessions.set(documentId, session);
    }
    return session;
  }

  function activeRun(documentId: string): RunLog | undefined {
    const log = sessions.get(documentId)?.run?.log;
    return log === undefined || log.isDone() ? undefined : log;
  }

  async function start(
    documentId: string,
    session: Session,
    request: { prompt: string; origin: RunOrigin; messageId?: string },
  ) {
    const opened = await options.openRun(documentId);
    if (opened === undefined) {
      return { error: "unknown-document" as const };
    }
    const metadata: SessionMessageMetadata = { origin: request.origin };
    const prompt: UIMessage = {
      id: request.messageId ?? generateId(),
      role: "user",
      metadata,
      parts: [{ type: "text", text: request.prompt }],
    };
    const messages = await chats.update(documentId, (chat) => [
      ...chat,
      prompt,
    ]);
    const abort = new AbortController();
    const stream = await streamAgentOnDocument(opened.document, messages, {
      ...options,
      extraChunk: opened.extraChunk,
      abortSignal: abort.signal,
      onEnd(answer) {
        // The save can take time in a store on a database. A read of the
        // chat in this process waits for it (see `messages`).
        session.saved = chats
          .update(documentId, (chat) => [...chat, answer])
          .catch((error: unknown) => options.onRunError?.(documentId, error));
      },
    });
    const log = createRunLog(
      generateId(),
      opened.openingChunk === undefined
        ? stream
        : withChunkAfterFirst(stream, opened.openingChunk),
    );
    session.run = { log, abort };
    options.onChange?.(documentId);
    log.done.then(
      () => {
        opened.close?.();
        options.onChange?.(documentId);
      },
      (error: unknown) => {
        opened.close?.();
        options.onRunError?.(documentId, error);
        options.onChange?.(documentId);
      },
    );
    return { run: log };
  }

  return {
    activeRun,
    async messages(documentId) {
      await sessionOf(documentId).saved;
      return chats.load(documentId);
    },
    async updateMessages(documentId, change) {
      await sessionOf(documentId).saved;
      await chats.update(documentId, change);
    },

    async startRun(documentId, request) {
      const session = sessionOf(documentId);
      // The start of a run takes time (the read of the document). A second
      // request in that time must not start a second run.
      if (activeRun(documentId) !== undefined || session.starting) {
        return { error: "run-active" };
      }
      session.starting = true;
      try {
        return await start(documentId, session, request);
      } finally {
        session.starting = false;
      }
    },

    stopRun(documentId) {
      const run = sessions.get(documentId)?.run;
      if (run !== undefined && !run.log.isDone()) {
        run.abort.abort();
      }
    },
  };
}

/** Returns the stream with one more chunk, after the first chunk of the stream. */
function withChunkAfterFirst(
  source: ReadableStream<UIMessageChunk>,
  added: UIMessageChunk,
): ReadableStream<UIMessageChunk> {
  let sent = false;
  return source.pipeThrough(
    new TransformStream<UIMessageChunk, UIMessageChunk>({
      transform(chunk, controller) {
        controller.enqueue(chunk);
        if (!sent) {
          sent = true;
          controller.enqueue(added);
        }
      },
    }),
  );
}
