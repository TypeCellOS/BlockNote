import * as Y from "@y/y";
import { afterEach, describe, expect, it } from "vite-plus/test";

import type { Chat, ChatStore } from "../stores/chatStore.js";
import { scriptedModel, type ScriptedStep } from "../testUtil.js";
import { keepSuggestionCurrent } from "./suggestionDocument.js";
import { createSuggestionSessionHost } from "./suggestionSessions.js";
import {
  FRAGMENT,
  initialMain,
  suggestionReplicaOf,
  textsOfDoc,
} from "./testUtil.js";

// A host in Yjs 14 mode does not know the Yjs provider of the app. These
// tests give it a provider and a chat store as an app does.

// jsdom has no layout: it does not have `scrollIntoView`.
Element.prototype.scrollIntoView = function scrollIntoView() {
  // No scroll in jsdom.
};

const cleanups: (() => void)[] = [];
afterEach(() => {
  while (cleanups.length) {
    cleanups.pop()?.();
  }
});

const editFirst: ScriptedStep = {
  toolCalls: [
    {
      toolName: "editText",
      input: { old: "First", new: "Opening", reason: "A better word" },
    },
  ],
};

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * The collaboration server of an app, and a provider for it: a replica of
 * the suggestion document that is in sync after some time, and that stays
 * in sync until the close.
 */
function createServer() {
  const main = initialMain();
  const suggestion = suggestionReplicaOf(main);
  cleanups.push(keepSuggestionCurrent(main, suggestion));
  const counts = { opened: 0, closed: 0 };

  async function connect() {
    counts.opened++;
    const replica = new Y.Doc({ isSuggestionDoc: true, gc: false });
    // The first sync takes time.
    await wait(5);
    Y.applyUpdate(replica, Y.encodeStateAsUpdate(suggestion));
    const toServer = (update: Uint8Array) => Y.applyUpdate(suggestion, update);
    const toReplica = (update: Uint8Array) => Y.applyUpdate(replica, update);
    replica.on("update", toServer);
    suggestion.on("update", toReplica);
    return {
      suggestion: replica,
      fragment: FRAGMENT,
      close() {
        counts.closed++;
        replica.off("update", toServer);
        suggestion.off("update", toReplica);
        replica.destroy();
      },
    };
  }
  return { main, suggestion, counts, connect };
}

async function run(
  host: ReturnType<typeof createSuggestionSessionHost>,
  prompt: string,
) {
  const started = await host.startRun("doc", { prompt, origin: "user" });
  if (started.error !== undefined) {
    throw new Error(`The run did not start: ${started.error}`);
  }
  await started.run.done;
}

describe("a host in Yjs 14 mode with the provider and the store of an app", () => {
  it("gets a replica from the provider for each run, and closes it after the run", async () => {
    const server = createServer();
    const host = createSuggestionSessionHost({
      model: scriptedModel([editFirst, { text: "Done." }]).model,
      openSuggestion: () => server.connect(),
    });

    await run(host, "Improve the text.");

    // The change of the agent is on the server, through the replica.
    expect(textsOfDoc(server.suggestion)).toContain("Opening paragraph.");
    expect(textsOfDoc(server.main)).toContain("First paragraph.");
    expect(server.counts).toEqual({ opened: 1, closed: 1 });

    // A read of the session gets a replica for the decisions, and closes it.
    await host.snapshot("doc");
    expect(server.counts).toEqual({ opened: 2, closed: 2 });
  });

  it("closes the replica if the run does not start", async () => {
    const server = createServer();
    const host = createSuggestionSessionHost({
      model: scriptedModel([editFirst, { text: "Done." }]).model,
      openSuggestion: () => server.connect(),
      // The run fails after the provider gave the replica.
      chats: {
        load: () => Promise.resolve({ messages: [] }),
        update: () =>
          Promise.reject(new Error("The chat store is not available")),
      },
    });

    await expect(run(host, "Improve the text.")).rejects.toThrow(
      "The chat store is not available",
    );
    expect(server.counts).toEqual({ opened: 1, closed: 1 });
  });

  it("keeps the chat in the store of the app, also after a restart of the host", async () => {
    // A store with a delay, as a database has it.
    const saved = new Map<string, Chat>();
    const chats: ChatStore = {
      async load(documentId) {
        await wait(2);
        return saved.get(documentId) ?? { messages: [] };
      },
      async update(documentId, change) {
        await wait(2);
        const chat = change(saved.get(documentId) ?? { messages: [] });
        saved.set(documentId, chat);
        return chat;
      },
    };
    const server = createServer();
    const host = createSuggestionSessionHost({
      model: scriptedModel([editFirst, { text: "Done." }]).model,
      openSuggestion: () => server.connect(),
      chats,
    });

    await run(host, "Improve the text.");

    // The read waits for the save of the message of the agent.
    const { messages } = await host.snapshot("doc");
    expect(messages.map((message) => message.role)).toEqual([
      "user",
      "assistant",
    ]);

    // A new host on the same store has the chat.
    const restarted = createSuggestionSessionHost({
      model: scriptedModel([{ text: "Nothing more to do." }]).model,
      openSuggestion: () => server.connect(),
      chats,
    });
    expect(
      (await restarted.snapshot("doc")).messages.map((message) => message.id),
    ).toEqual(messages.map((message) => message.id));
  });
});
