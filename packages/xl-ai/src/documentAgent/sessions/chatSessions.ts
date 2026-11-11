import {
  generateId,
  readUIMessageStream,
  type UIMessage,
  type UIMessageChunk,
} from "ai";

import {
  type DocumentAgentOptions,
  streamAgentOnDocument,
} from "../agent/documentAgent.js";
import {
  type ChatStore,
  createInMemoryChatStore,
} from "../stores/chatStore.js";
import { createInMemoryRunStore, type RunStore } from "../stores/runStore.js";
import type { AgentDocument } from "../tools/agentDocument.js";

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
  /**
   * The store of the streams of the runs. The default is a store in the
   * memory of this process (see `RunStore`).
   */
  runs?: RunStore;
  /** Called when the session of a document changed: a run started or ended. */
  onChange?(documentId: string): void;
  /** Called when the stream of a run failed. This is a bug or an outage. */
  onRunError?(documentId: string, error: unknown): void;
};

/** A run of the agent on a document, for a client that follows it. */
export type Run = {
  readonly id: string;
  /**
   * A stream for one client: all chunks from the start of the run, then
   * each new chunk, until the run ends.
   */
  follow(): Promise<ReadableStream<UIMessageChunk>>;
};

/** A run, for the host that started it. */
export type StartedRun = Run & {
  /**
   * Resolves when the run ended, and the chat has the message of the
   * agent. It rejects if the stream of the run failed.
   */
  readonly done: Promise<void>;
};

/**
 * The chats and the runs of the documents of a host, for each mode of the
 * document agent. A document has one chat, and one run at a time. Each run
 * starts with {@link startRun}: a run that a user starts in the chat, and
 * a run that a caller outside the editors starts. The only difference is
 * the origin in the message of the chat.
 *
 * Each editor of the document follows the same stream of a run (see
 * `Run.follow`).
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
    | { error?: undefined; run: StartedRun }
    /** A document has one run at a time. */
    | { error: "run-active" }
    | { error: "unknown-document" }
  >;
  /** The run in progress of the document, of this process or of a different one. */
  activeRun(documentId: string): Promise<Run | undefined>;
  /** Stops the run in progress. The changes that it wrote stay. */
  stopRun(documentId: string): Promise<void>;
};

/**
 * Makes the chats and the runs of a host. The state is in two stores: the
 * chat of each document with the ID of its run in progress (`ChatStore`),
 * and the stream of each run (`RunStore`). This code keeps no state of a
 * document in the memory of the process. Thus, with stores that all
 * processes of a host can read:
 *
 * - An editor follows a run through each process, also after a reload.
 * - Only one process can start a run for a document: the start is a
 *   compare and swap on the chat.
 * - After a crash or a restart of the process of a run, the next read of
 *   the session puts the message of the agent into the chat, with the tool
 *   calls to that point.
 *
 * The message of the agent in the chat is always made from the chunks of
 * the run: at the normal end, after a stop, after a failure, and after a
 * crash.
 */
export function createChatSessions<Extra extends object>(
  options: ChatSessionsOptions<Extra>,
): ChatSessions {
  const chats = options.chats ?? createInMemoryChatStore();
  const runs = options.runs ?? createInMemoryRunStore();

  function runOf(id: string): Run {
    return {
      id,
      // A store that does not have the run any more: the run ended.
      follow: async () => (await runs.follow(id)) ?? streamOf([]),
    };
  }

  /**
   * Ends a run in the chat: the chat gets the message of the agent, and
   * the document has no run in progress. The chat applies this one time
   * for a run, also if two processes call it.
   */
  async function settle(
    documentId: string,
    runId: string,
    chunks: readonly UIMessageChunk[],
  ) {
    const answer = await messageOf(chunks);
    await chats.update(documentId, (chat) =>
      chat.activeRunId !== runId
        ? chat
        : {
            messages:
              answer === undefined ? chat.messages : [...chat.messages, answer],
          },
    );
  }

  /**
   * The ID of the run in progress of the document. If the process of the
   * run stopped without an end, this function ends the run in the chat
   * with the chunks that the store has.
   */
  async function liveRunOf(documentId: string): Promise<string | undefined> {
    const { activeRunId } = await chats.load(documentId);
    if (activeRunId === undefined) {
      return undefined;
    }
    const status = await runs.status(activeRunId);
    if (status === "running") {
      return activeRunId;
    }
    const stream =
      status === undefined ? undefined : await runs.follow(activeRunId);
    await settle(
      documentId,
      activeRunId,
      stream === undefined ? [] : await chunksOf(stream),
    );
    options.onChange?.(documentId);
    return undefined;
  }

  /**
   * Reads the stream of a run to its end, and writes each chunk to the
   * run store. At the end, the chat gets the message of the agent before
   * the followers get the end of the stream: a client that reads the
   * session after the end of the stream has the message.
   */
  async function record(
    documentId: string,
    runId: string,
    source: ReadableStream<UIMessageChunk>,
    writer: Awaited<ReturnType<RunStore["create"]>>,
  ) {
    const chunks: UIMessageChunk[] = [];
    let failure: { error: unknown } | undefined;
    try {
      const reader = source.getReader();
      for (;;) {
        const next = await reader.read();
        if (next.done) {
          break;
        }
        chunks.push(next.value);
        await writer.append(next.value);
      }
    } catch (error) {
      failure = { error };
    }
    try {
      await settle(documentId, runId, chunks);
    } finally {
      await writer.end();
    }
    if (failure !== undefined) {
      throw failure.error;
    }
  }

  return {
    async activeRun(documentId) {
      const runId = await liveRunOf(documentId);
      return runId === undefined ? undefined : runOf(runId);
    },
    async messages(documentId) {
      return (await chats.load(documentId)).messages;
    },
    async updateMessages(documentId, change) {
      await chats.update(documentId, (chat) => ({
        ...chat,
        messages: change(chat.messages),
      }));
    },

    async startRun(documentId, request) {
      if ((await liveRunOf(documentId)) !== undefined) {
        return { error: "run-active" };
      }
      const opened = await options.openRun(documentId);
      if (opened === undefined) {
        return { error: "unknown-document" };
      }
      const runId = generateId();
      const metadata: SessionMessageMetadata = { origin: request.origin };
      const prompt: UIMessage = {
        id: request.messageId ?? generateId(),
        role: "user",
        metadata,
        parts: [{ type: "text", text: request.prompt }],
      };
      let source: ReadableStream<UIMessageChunk>;
      let writer: Awaited<ReturnType<RunStore["create"]>> | undefined;
      try {
        // The claim of the one run of the document: a compare and swap.
        // Two requests at the same time, also in two processes, cannot
        // both get it.
        let claimed = false;
        const chat = await chats.update(documentId, (chat) => {
          claimed = chat.activeRunId === undefined;
          return claimed
            ? { messages: [...chat.messages, prompt], activeRunId: runId }
            : chat;
        });
        if (!claimed) {
          opened.close?.();
          return { error: "run-active" };
        }
        writer = await runs.create(runId);
        const abort = new AbortController();
        writer.onStop(() => abort.abort());
        const stream = await streamAgentOnDocument(
          opened.document,
          chat.messages,
          {
            ...options,
            extraChunk: opened.extraChunk,
            abortSignal: abort.signal,
            messageId: true,
          },
        );
        source =
          opened.openingChunk === undefined
            ? stream
            : withChunkAfterFirst(stream, opened.openingChunk);
      } catch (error) {
        // The run did not start.
        opened.close?.();
        if (writer !== undefined) {
          await settle(documentId, runId, []);
          await writer.end();
        }
        // Without a record, the next read of the session ends the run in
        // the chat (see `liveRunOf`).
        throw error;
      }
      const done = record(documentId, runId, source, writer);
      options.onChange?.(documentId);
      done.then(
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
      return { run: { ...runOf(runId), done } };
    },

    async stopRun(documentId) {
      const { activeRunId } = await chats.load(documentId);
      if (activeRunId !== undefined) {
        await runs.requestStop(activeRunId);
      }
    },
  };
}

/** A stream of the chunks, with its end. */
function streamOf(
  chunks: readonly UIMessageChunk[],
): ReadableStream<UIMessageChunk> {
  return new ReadableStream<UIMessageChunk>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });
}

/** All chunks of a stream that ends. */
async function chunksOf(
  stream: ReadableStream<UIMessageChunk>,
): Promise<UIMessageChunk[]> {
  const chunks: UIMessageChunk[] = [];
  const reader = stream.getReader();
  for (;;) {
    const next = await reader.read();
    if (next.done) {
      return chunks;
    }
    chunks.push(next.value);
  }
}

/**
 * The message of the agent that the chunks of a run make: the same message
 * that a client makes from the stream. `undefined` if the chunks have no
 * content, for example for a run that stopped before its first chunk.
 */
async function messageOf(
  chunks: readonly UIMessageChunk[],
): Promise<UIMessage | undefined> {
  let message: UIMessage | undefined;
  for await (const state of readUIMessageStream({ stream: streamOf(chunks) })) {
    message = state;
  }
  if (message === undefined) {
    return undefined;
  }
  const parts = message.parts.flatMap((part) => endedPart(part));
  return parts.length === 0 ? undefined : { ...message, parts };
}

/** The error of a tool call of a run that stopped before the tool call ended. */
const TOOL_CALL_NOT_ENDED =
  "The run stopped before this tool call ended. The document shows if the change applied.";

/**
 * A part of the message of the agent, in a state that a later run can
 * read. A run that stopped before its end (a stop, a failure, a crash)
 * leaves tool calls without a result, and a model cannot get such a call:
 *
 * - A tool call that the model did not write completely goes away: its
 *   tool did not start.
 * - A tool call without a result gets an error as its result. The agent
 *   reads the document at the start of each run: the document shows if
 *   the change applied.
 */
function endedPart(part: UIMessage["parts"][number]): UIMessage["parts"] {
  const tool = part as { type: string; state?: unknown };
  if (!tool.type.startsWith("tool-") && tool.type !== "dynamic-tool") {
    return [part];
  }
  switch (tool.state) {
    case "input-streaming":
      return [];
    case "input-available":
      return [
        {
          ...part,
          state: "output-error",
          errorText: TOOL_CALL_NOT_ENDED,
        } as UIMessage["parts"][number],
      ];
    default:
      return [part];
  }
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
