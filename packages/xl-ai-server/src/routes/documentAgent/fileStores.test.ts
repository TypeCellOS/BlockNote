// @vitest-environment node
import type { UIMessage, UIMessageChunk } from "ai";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";

import {
  createFileChatStore,
  createFileDocumentStore,
  createFileProposalStore,
  createFileRunStore,
} from "./fileStores.js";

// Two stores on one directory are two server processes: they have only
// the files in common.

const directories: string[] = [];
function directory() {
  const made = mkdtempSync(join(tmpdir(), "document-agent-stores-"));
  directories.push(made);
  return made;
}
afterEach(() => {
  while (directories.length) {
    rmSync(directories.pop()!, { recursive: true, force: true });
  }
});

function messageOf(text: string): UIMessage {
  return { id: text, role: "user", parts: [{ type: "text", text }] };
}

function chunkOf(delta: string): UIMessageChunk {
  return { type: "text-delta", id: "text-1", delta };
}

async function chunksOf(stream: ReadableStream<UIMessageChunk> | undefined) {
  if (stream === undefined) {
    throw new Error("The store does not have the run");
  }
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

describe("the chat store on files", () => {
  it("keeps the chat for a second process", async () => {
    const folder = directory();
    const first = createFileChatStore(folder);
    await first.update("doc/1", (chat) => ({
      messages: [...chat.messages, messageOf("Hello")],
      activeRunId: "run-1",
    }));

    expect(await createFileChatStore(folder).load("doc/1")).toEqual({
      messages: [messageOf("Hello")],
      activeRunId: "run-1",
    });
    expect(await first.load("other")).toEqual({ messages: [] });
  });

  it("does not lose a message if two processes change the chat at the same time", async () => {
    const folder = directory();
    const stores = [createFileChatStore(folder), createFileChatStore(folder)];

    await Promise.all(
      Array.from({ length: 20 }, (_, index) =>
        stores[index % 2].update("doc", (chat) => ({
          messages: [...chat.messages, messageOf(`Message ${index}`)],
        })),
      ),
    );

    const { messages } = await stores[0].load("doc");
    expect(messages.map((message) => message.id).sort()).toEqual(
      Array.from({ length: 20 }, (_, index) => `Message ${index}`).sort(),
    );
  });

  it("gives the run of a document to one of two processes", async () => {
    const folder = directory();
    const stores = [createFileChatStore(folder), createFileChatStore(folder)];

    const claims = await Promise.all(
      stores.map(async (store, index) => {
        let claimed = false;
        await store.update("doc", (chat) => {
          claimed = chat.activeRunId === undefined;
          return claimed ? { ...chat, activeRunId: `run-${index}` } : chat;
        });
        return claimed;
      }),
    );

    expect(claims.filter(Boolean)).toHaveLength(1);
  });
});

describe("the run store on files", () => {
  it("gives a second process the chunks of a run from its start, to its end", async () => {
    const folder = directory();
    const writer = await createFileRunStore(folder).create("run-1");
    await writer.append(chunkOf("One "));
    const second = createFileRunStore(folder);

    expect(await second.status("run-1")).toBe("running");
    const followed = chunksOf(await second.follow("run-1"));
    await writer.append(chunkOf("two "));
    await writer.append(chunkOf("thrée."));
    await writer.end();

    expect(await followed).toEqual([
      chunkOf("One "),
      chunkOf("two "),
      chunkOf("thrée."),
    ]);
    expect(await second.status("run-1")).toBe("ended");
    // A client that comes after the end gets the full run.
    expect(await chunksOf(await second.follow("run-1"))).toHaveLength(3);
  });

  it("does not have a run that no process started", async () => {
    const store = createFileRunStore(directory());

    expect(await store.status("unknown")).toBeUndefined();
    expect(await store.follow("unknown")).toBeUndefined();
  });

  it("tells the process of a run that a second process asked for a stop", async () => {
    const folder = directory();
    const writer = await createFileRunStore(folder).create("run-1");
    const stopped = new Promise<void>((resolve) => writer.onStop(resolve));

    await createFileRunStore(folder).requestStop("run-1");

    await stopped;
    await writer.end();
  });

  it("has the chunks of a run whose process stopped, and gives them with an end", async () => {
    // The record of a run of a process that does not exist: it has two
    // chunks and no end.
    const folder = directory();
    mkdirSync(join(folder, "run-1"));
    writeFileSync(join(folder, "run-1", "owner"), "999999999");
    writeFileSync(
      join(folder, "run-1", "chunks.ndjson"),
      `${JSON.stringify(chunkOf("One "))}\n${JSON.stringify(chunkOf("two"))}\n`,
    );
    const store = createFileRunStore(folder);

    expect(await store.status("run-1")).toBe("lost");
    expect(await chunksOf(await store.follow("run-1"))).toEqual([
      chunkOf("One "),
      chunkOf("two"),
    ]);
  });
});

describe("the proposal store and the document store on files", () => {
  it("keeps a proposal until its removal", async () => {
    const folder = directory();
    const store = createFileProposalStore(folder);
    const saved: string[] = [];
    store.subscribe((id) => saved.push(id));
    const proposal = { origin: [], batches: [] };

    await store.save("session:doc", proposal);

    expect(await createFileProposalStore(folder).load("session:doc")).toEqual(
      proposal,
    );
    expect(saved).toEqual(["session:doc"]);
    await store.delete("session:doc");
    expect(await store.load("session:doc")).toBeUndefined();
    // The removal of a proposal that the store does not have is not an error.
    await store.delete("session:doc");
  });

  it("keeps a document", async () => {
    const folder = directory();
    const blocks = [
      { id: "p1", type: "paragraph", props: {}, content: [], children: [] },
    ];

    await createFileDocumentStore(folder).write("doc", blocks as never);

    expect(await createFileDocumentStore(folder).read("doc")).toEqual(blocks);
    expect(await createFileDocumentStore(folder).read("other")).toBeUndefined();
  });
});
