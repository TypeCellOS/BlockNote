import type { UIMessageChunk } from "ai";

/**
 * The record of one run of the agent: the chunks of its UI message stream,
 * from the start. The record reads the stream itself. Thus, the run
 * continues if no client follows it, and a client that comes later gets
 * the full run.
 */
export type RunLog = {
  readonly id: string;
  /** Returns true if the run ended. */
  isDone(): boolean;
  /**
   * Resolves when the run ended. It rejects if the stream of the run
   * failed.
   */
  readonly done: Promise<void>;
  /**
   * A stream for one client: all chunks from the start of the run, then
   * each new chunk, until the run ends.
   */
  follow(): ReadableStream<UIMessageChunk>;
};

/** Starts the record of a run: it reads `source` to its end. */
export function createRunLog(
  id: string,
  source: ReadableStream<UIMessageChunk>,
): RunLog {
  const chunks: UIMessageChunk[] = [];
  const followers = new Set<ReadableStreamDefaultController<UIMessageChunk>>();
  let ended = false;

  async function read() {
    const reader = source.getReader();
    try {
      for (;;) {
        const next = await reader.read();
        if (next.done) {
          return;
        }
        chunks.push(next.value);
        for (const follower of followers) {
          follower.enqueue(next.value);
        }
      }
    } finally {
      ended = true;
      for (const follower of followers) {
        follower.close();
      }
      followers.clear();
    }
  }

  return {
    id,
    isDone: () => ended,
    done: read(),
    follow() {
      let follower: ReadableStreamDefaultController<UIMessageChunk> | undefined;
      return new ReadableStream<UIMessageChunk>({
        start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(chunk);
          }
          if (ended) {
            controller.close();
          } else {
            follower = controller;
            followers.add(controller);
          }
        },
        cancel() {
          if (follower !== undefined) {
            followers.delete(follower);
          }
        },
      });
    },
  };
}
