import type { UIMessageChunk } from "ai";

/**
 * The state of the record of a run:
 *
 * - `running`: a process writes the run.
 * - `ended`: the run has its end.
 * - `lost`: the process that wrote the run stopped without an end (a crash
 *   or a restart). The record has the chunks to that point.
 */
export type RunStatus = "running" | "ended" | "lost";

/** The record of one run, for the process that runs it. */
export type RunWriter = {
  /** Adds a chunk of the UI message stream of the run. */
  append(chunk: UIMessageChunk): Promise<void>;
  /** Ends the record: each follower gets the end of the stream. */
  end(): Promise<void>;
  /** Calls the listener when a process asks for a stop of the run (see `RunStore.requestStop`). */
  onStop(listener: () => void): void;
};

/**
 * A store for the streams of the runs of a host. The session code of each
 * mode uses it (`sessions/chatSessions.ts`).
 *
 * A run is the work of one process: the agent loop is there. The store has
 * the chunks of its UI message stream, from the start. Thus:
 *
 * - An editor that comes later, or that reloads its page, gets the full
 *   run.
 * - With a store that all processes of a host can read, an editor follows
 *   a run through each process, and each process can ask for a stop.
 * - After a crash or a restart of the process of a run, the chunks to that
 *   point are there: the session code puts the message of the agent into
 *   the chat (see `createChatSessions`).
 *
 * The store in memory is sufficient for one process, and for a test. A
 * production host gives a store on its infrastructure, for example Redis
 * streams. A store keeps an ended run for some time: an editor that got
 * the ID of the run a short time before its end can follow it.
 */
export type RunStore = {
  /** Starts the record of a run. */
  create(runId: string): Promise<RunWriter>;
  /** The state of a run, or `undefined` if the store does not have the run. */
  status(runId: string): Promise<RunStatus | undefined>;
  /**
   * A stream for one client: all chunks from the start of the run, then
   * each new chunk, until the run is not `running`. `undefined` if the
   * store does not have the run.
   */
  follow(runId: string): Promise<ReadableStream<UIMessageChunk> | undefined>;
  /** Asks the process that writes the run to stop it. No effect for a run that is not `running`. */
  requestStop(runId: string): Promise<void>;
};

/** The number of ended runs that the store in memory keeps. */
const KEPT_ENDED_RUNS = 20;

/** A run store in the memory of this process. */
export function createInMemoryRunStore(): RunStore {
  type Run = {
    chunks: UIMessageChunk[];
    followers: Set<ReadableStreamDefaultController<UIMessageChunk>>;
    stopListeners: (() => void)[];
    ended: boolean;
  };
  const runs = new Map<string, Run>();
  /** The ended runs, the oldest one first. */
  const ended: string[] = [];

  return {
    async create(runId) {
      const run: Run = {
        chunks: [],
        followers: new Set(),
        stopListeners: [],
        ended: false,
      };
      runs.set(runId, run);
      return {
        async append(chunk) {
          run.chunks.push(chunk);
          for (const follower of run.followers) {
            follower.enqueue(chunk);
          }
        },
        async end() {
          run.ended = true;
          for (const follower of run.followers) {
            follower.close();
          }
          run.followers.clear();
          ended.push(runId);
          if (ended.length > KEPT_ENDED_RUNS) {
            runs.delete(ended.shift()!);
          }
        },
        onStop(listener) {
          run.stopListeners.push(listener);
        },
      };
    },

    async status(runId) {
      const run = runs.get(runId);
      // The store and the run are one process: a run is never lost.
      return run === undefined ? undefined : run.ended ? "ended" : "running";
    },

    async follow(runId) {
      const run = runs.get(runId);
      if (run === undefined) {
        return undefined;
      }
      let follower: ReadableStreamDefaultController<UIMessageChunk> | undefined;
      return new ReadableStream<UIMessageChunk>({
        start(controller) {
          for (const chunk of run.chunks) {
            controller.enqueue(chunk);
          }
          if (run.ended) {
            controller.close();
          } else {
            follower = controller;
            run.followers.add(controller);
          }
        },
        cancel() {
          if (follower !== undefined) {
            run.followers.delete(follower);
          }
        },
      });
    },

    async requestStop(runId) {
      const run = runs.get(runId);
      if (run !== undefined && !run.ended) {
        for (const listener of run.stopListeners) {
          listener();
        }
      }
    },
  };
}
