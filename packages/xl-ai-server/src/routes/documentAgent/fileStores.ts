import type {
  Chat,
  ChatStore,
  DocumentSource,
  Proposal,
  ProposalStore,
  RunStatus,
  RunStore,
  RunWriter,
} from "@blocknote/xl-ai/server";
import type { UIMessageChunk } from "ai";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import {
  appendFile,
  mkdir,
  open,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  utimes,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";

// Stores of the document agent on files, for this demo server. With them,
// the state of a session is not in the memory of the process:
//
// - The chat, the proposals and the JSON documents stay after a restart of
//   the server.
// - The stream of a run is a file. An editor that reloads its page gets
//   the full run, also through a second server process on the same
//   directory, and also after a restart of the process of the run (the
//   chunks to that point).
//
// The files are readable: a chat and a proposal are JSON, and a run is one
// JSON line for each chunk of its stream.
//
// These stores show what the interfaces need. They are not for production:
// a production host uses its database for the chats and the proposals, and
// for example Redis streams for the runs. The files are correct for
// processes on one computer with one file system.

/** The name of the file or the folder of an ID. An ID can have characters that a file name cannot have. */
function nameOf(id: string): string {
  return encodeURIComponent(id);
}

function isMissing(error: unknown): boolean {
  return (error as { code?: unknown } | null)?.code === "ENOENT";
}

async function readJson<T>(file: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch (error) {
    if (isMissing(error)) {
      return undefined;
    }
    throw error;
  }
}

let writes = 0;

/**
 * Writes a file in one step: a reader gets the old content or the new
 * content, never a part of the new content.
 */
async function writeJson(file: string, value: unknown): Promise<void> {
  const temporary = `${file}.${process.pid}.${writes++}.tmp`;
  await writeFile(temporary, JSON.stringify(value));
  await rename(temporary, file);
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/** A lock of a process that stopped is older than this time. */
const LOCK_STALE_MS = 5000;

/**
 * Runs a task with the lock of a file. One task has the lock at a time,
 * also if the tasks are in different processes: the lock is a file that
 * only one process can make.
 */
async function withLock<T>(file: string, task: () => Promise<T>): Promise<T> {
  const lock = `${file}.lock`;
  for (;;) {
    try {
      await (await open(lock, "wx")).close();
      break;
    } catch (error) {
      if ((error as { code?: unknown } | null)?.code !== "EEXIST") {
        throw error;
      }
      const made = await stat(lock).then(
        (stats) => stats.mtimeMs,
        () => undefined,
      );
      if (made !== undefined && Date.now() - made > LOCK_STALE_MS) {
        await rm(lock, { force: true });
      } else {
        await wait(5);
      }
    }
  }
  try {
    return await task();
  } finally {
    await rm(lock, { force: true });
  }
}

/** A chat store on files: one JSON file for each document. */
export function createFileChatStore(directory: string): ChatStore {
  mkdirSync(directory, { recursive: true });
  function fileOf(documentId: string) {
    return join(directory, `${nameOf(documentId)}.json`);
  }
  return {
    async load(documentId) {
      return (await readJson<Chat>(fileOf(documentId))) ?? { messages: [] };
    },
    update(documentId, change) {
      const file = fileOf(documentId);
      // The read and the write are one step for all processes. Thus, only
      // one process can start a run of a document.
      return withLock(file, async () => {
        const chat = change((await readJson<Chat>(file)) ?? { messages: [] });
        await writeJson(file, chat);
        return chat;
      });
    },
  };
}

/** A proposal store on files, with a listener for each save of this process. */
export function createFileProposalStore(directory: string): ProposalStore & {
  subscribe(listener: (id: string, proposal: Proposal) => void): () => void;
} {
  mkdirSync(directory, { recursive: true });
  const listeners = new Set<(id: string, proposal: Proposal) => void>();
  function fileOf(id: string) {
    return join(directory, `${nameOf(id)}.json`);
  }
  return {
    load: (id) => readJson<Proposal>(fileOf(id)),
    async save(id, proposal) {
      await writeJson(fileOf(id), proposal);
      for (const listener of listeners) {
        listener(id, proposal);
      }
    },
    async delete(id) {
      await rm(fileOf(id), { force: true });
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** A document store: the main documents of an app that saves Block JSON. */
export type DocumentStore = DocumentSource & {
  write(
    documentId: string,
    blocks: NonNullable<Awaited<ReturnType<DocumentSource["read"]>>>,
  ): void | Promise<void>;
};

/** A document store on files: one JSON file for each document. */
export function createFileDocumentStore(directory: string): DocumentStore {
  mkdirSync(directory, { recursive: true });
  function fileOf(documentId: string) {
    return join(directory, `${nameOf(documentId)}.json`);
  }
  return {
    read: (documentId) => readJson(fileOf(documentId)),
    write: (documentId, blocks) => writeJson(fileOf(documentId), blocks),
  };
}

/** The time between two checks of a follower for new chunks. */
const FOLLOW_POLL_MS = 40;
/** The time between two checks of the process of a run for a stop request. */
const STOP_POLL_MS = 250;
/** The process of a run tells that it is alive after each number of stop checks. */
const ALIVE_EVERY = 4;
/** A run whose process did not tell that it is alive for this time is lost. */
const LOST_AFTER_MS = 5000;
/** The store removes the record of a run after this time. */
const KEEP_RUN_MS = 60 * 60 * 1000;

/**
 * A run store on files. A run is a folder:
 *
 * - `chunks.ndjson`: one JSON line for each chunk of the stream. The
 *   process of the run changes the time of this file while it is alive.
 * - `owner`: the ID of the process of the run.
 * - `end`: exists if the run has its end.
 * - `stop`: exists if a process asked for a stop.
 *
 * A follower reads the new lines of `chunks.ndjson` again and again. Thus,
 * each process on the directory can follow a run.
 */
export function createFileRunStore(directory: string): RunStore {
  mkdirSync(directory, { recursive: true });
  function folderOf(runId: string) {
    return join(directory, nameOf(runId));
  }
  function chunksOf(runId: string) {
    return join(folderOf(runId), "chunks.ndjson");
  }

  /** True if the process with the ID exists on this computer. */
  function isAlive(processId: number): boolean {
    try {
      // The signal 0 sends nothing: it only examines the process.
      process.kill(processId, 0);
      return true;
    } catch {
      return false;
    }
  }

  async function status(runId: string): Promise<RunStatus | undefined> {
    const written = await stat(chunksOf(runId)).then(
      (stats) => stats.mtimeMs,
      () => undefined,
    );
    if (written === undefined) {
      return undefined;
    }
    if (existsSync(join(folderOf(runId), "end"))) {
      return "ended";
    }
    const owner = Number(
      await readFile(join(folderOf(runId), "owner"), "utf8").catch(() => ""),
    );
    return Number.isInteger(owner) &&
      isAlive(owner) &&
      Date.now() - written < LOST_AFTER_MS
      ? "running"
      : "lost";
  }

  /** Removes the records of old runs. A failure has no effect on a run. */
  async function removeOldRuns() {
    for (const name of await readdir(directory)) {
      const written = await stat(join(directory, name, "chunks.ndjson")).then(
        (stats) => stats.mtimeMs,
        () => undefined,
      );
      if (written !== undefined && Date.now() - written > KEEP_RUN_MS) {
        await rm(join(directory, name), { recursive: true, force: true });
      }
    }
  }

  return {
    status,

    async create(runId): Promise<RunWriter> {
      void removeOldRuns().catch(() => undefined);
      const folder = folderOf(runId);
      const file = chunksOf(runId);
      await mkdir(folder, { recursive: true });
      await writeFile(join(folder, "owner"), String(process.pid));
      await writeFile(file, "");

      const stopListeners: (() => void)[] = [];
      let stopped = false;
      let checks = 0;
      /** Tells the listeners one time if a process asked for a stop. */
      function checkStop() {
        if (!stopped && existsSync(join(folder, "stop"))) {
          stopped = true;
          for (const listener of stopListeners) {
            listener();
          }
        }
      }
      const timer = setInterval(() => {
        checkStop();
        if (++checks % ALIVE_EVERY === 0) {
          const now = new Date();
          void utimes(file, now, now).catch(() => undefined);
        }
      }, STOP_POLL_MS);

      return {
        async append(chunk) {
          await appendFile(file, `${JSON.stringify(chunk)}\n`);
          checkStop();
        },
        async end() {
          clearInterval(timer);
          await writeFile(join(folder, "end"), "");
        },
        onStop(listener) {
          stopListeners.push(listener);
        },
      };
    },

    async follow(runId) {
      if ((await status(runId)) === undefined) {
        return undefined;
      }
      const file = chunksOf(runId);
      let cancelled = false;
      /** Reads the file to the end of the run, and gives each chunk to the stream. */
      async function read(
        controller: ReadableStreamDefaultController<UIMessageChunk>,
      ) {
        let offset = 0;
        /** The bytes after the last full line. */
        let rest = Buffer.alloc(0);
        try {
          while (!cancelled) {
            // The state first: a run that ended has all its chunks in the
            // file before its end.
            const state = await status(runId);
            const handle = await open(file, "r");
            try {
              const { size } = await handle.stat();
              if (size > offset) {
                const added = Buffer.alloc(size - offset);
                await handle.read(added, 0, added.length, offset);
                offset = size;
                const bytes = Buffer.concat([rest, added]);
                const end = bytes.lastIndexOf(0x0a) + 1;
                rest = bytes.subarray(end);
                const lines = bytes.subarray(0, end).toString("utf8");
                for (const line of lines.split("\n")) {
                  if (line !== "") {
                    controller.enqueue(JSON.parse(line) as UIMessageChunk);
                  }
                }
              }
            } finally {
              await handle.close();
            }
            if (state !== "running") {
              break;
            }
            await wait(FOLLOW_POLL_MS);
          }
          if (!cancelled) {
            controller.close();
          }
        } catch (error) {
          if (isMissing(error)) {
            // The store removed the record of the run.
            controller.close();
          } else {
            controller.error(error);
          }
        }
      }
      return new ReadableStream<UIMessageChunk>({
        start(controller) {
          void read(controller);
        },
        cancel() {
          cancelled = true;
        },
      });
    },

    async requestStop(runId) {
      if ((await status(runId)) === "running") {
        await writeFile(join(folderOf(runId), "stop"), "");
      }
    },
  };
}

/**
 * Keeps the state of a Yjs document in a file: loads the state now, and
 * writes the full state after each update. The functions are parameters:
 * the server has documents of two versions of Yjs.
 */
export function keepInFile(
  file: string,
  doc: {
    /** Applies a stored state to the document. */
    apply(state: Uint8Array): void;
    /** The full state of the document. */
    encode(): Uint8Array;
    /** Calls the listener after each update of the document. */
    onUpdate(listener: () => void): void;
  },
): void {
  if (existsSync(file)) {
    doc.apply(readFileSync(file));
  }
  doc.onUpdate(() => {
    // The write is complete before the next event: a stop of the process
    // after a change does not lose the change. The new file replaces the
    // old one in one step.
    writeFileSync(`${file}.tmp`, doc.encode());
    renameSync(`${file}.tmp`, file);
  });
}
