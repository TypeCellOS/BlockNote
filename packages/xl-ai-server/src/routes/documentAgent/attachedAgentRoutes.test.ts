// @vitest-environment node
// The DOM for BlockNote, as the server installs it.
import "../../dom.js";

import { BlockNoteEditor, type PartialBlock } from "@blocknote/core";
import {
  createAttachedAgents,
  createInMemoryDocumentStore,
  createInMemoryProposalStore,
  headlessEditorFactory,
  type SessionSnapshot,
} from "@blocknote/xl-ai-lenses/server";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { registerSessionRoutes } from "./sessions.js";

// The test from end to end of an attached agent, without a model:
//
//   chat request of an editor (HTTP) -> session routes -> attached agents
//   <- the calls of the agent (HTTP)
//
// The test plays the editor and the agent with `fetch`, as a browser and
// `curl` do. All other parts are the real code. The server is a real HTTP
// server on a local port.

// The session routes need the model of the server for the built-in loop,
// also if no run uses it. No test of this file calls the model.
process.env.ANTHROPIC_API_KEY ??= "a-key-that-no-test-uses";

const TOKEN = "token-of-the-user";

const cleanups: (() => void | Promise<void>)[] = [];
afterEach(async () => {
  while (cleanups.length) {
    await cleanups.pop()?.();
  }
});

function documentOf(blocks: PartialBlock[]) {
  return BlockNoteEditor.create({
    initialContent: blocks,
    trailingBlock: false,
  }).document;
}

/** A server with the session routes, and one document `doc` in the JSON store. */
async function startServer() {
  const documents = createInMemoryDocumentStore();
  documents.write(
    "doc",
    documentOf([
      { id: "title", type: "heading", content: "Title" },
      { id: "p1", type: "paragraph", content: "First paragraph." },
      { id: "p2", type: "paragraph", content: "Second paragraph." },
    ]),
  );
  const route = new Hono();
  registerSessionRoutes(route, {
    sources: { json: documents },
    proposals: createInMemoryProposalStore(),
    createEditor: headlessEditorFactory(),
    notify: () => undefined,
    agents: createAttachedAgents({ waitMs: 2000 }),
  });
  const { port } = await new Promise<AddressInfo>((resolve) => {
    const server = serve({ fetch: route.fetch, port: 0 }, resolve);
    cleanups.push(() => void server.close());
  });
  const session = `http://127.0.0.1:${port}/sessions/json/doc`;
  /** The link that the user gives to the agent. */
  const link = `${session}/agents/${TOKEN}`;

  /** A call of the agent: the status and the text of the response. */
  async function call(path: string, body?: string, type = "text/plain") {
    const response = await fetch(`${link}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { "content-type": type },
      body,
    });
    return { status: response.status, text: await response.text() };
  }

  return {
    session,
    link,
    call,
    /** The editor of the user attaches the agent. */
    attach: () => fetch(link, { method: "PUT" }),
    tool: (name: string, input: object) =>
      call(`/tools/${name}`, JSON.stringify(input), "application/json"),
    /** A message of the user in the chat of the editor, for the agent. */
    ask: (text: string, token = TOKEN) =>
      fetch(`${session}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: { parts: [{ type: "text", text }] },
          agent: { token },
        }),
      }),
    state: async () => (await fetch(`${link}/state`)).json(),
    snapshot: async () =>
      (await (await fetch(session)).json()) as SessionSnapshot,
  };
}

const EDIT = { old: "First", new: "Opening", reason: "A better first word." };

describe("the HTTP door of an attached agent", () => {
  it("gives the instructions for the link, only after the editor attached the agent", async () => {
    const { link, call, attach } = await startServer();

    expect(await call("")).toMatchObject({ status: 404 });
    expect(await call("/events")).toMatchObject({ status: 404 });
    expect(await call("/tools/readDocument", "{}")).toMatchObject({
      status: 404,
      text: expect.stringContaining("This link is not active"),
    });
    await attach();
    const instructions = await call("");

    expect(instructions.status).toBe(200);
    // Each request of the instructions has the URL of the link.
    expect(instructions.text).toContain(`curl -sf "${link}/events"`);
    expect(instructions.text).toContain(`"${link}/reply"`);
    for (const name of [
      "readDocument",
      "editText",
      "replaceRange",
      "writeDocument",
    ]) {
      expect(instructions.text).toContain(`### ${name}`);
    }
    expect(instructions.text).toContain(
      `Bash(curl * ${new URL(link).origin}/*)`,
    );
  });

  it("gives a request of the editor to the agent, and puts the work of the agent into the chat", async () => {
    const { call, tool, attach, ask, state, snapshot } = await startServer();
    await attach();
    expect(await state()).toEqual({ listening: false, working: false });
    // The agent listens: its request for the next event waits.
    const waiting = call("/events");
    while (!(await state()).listening) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }

    const chat = await ask("Improve the start.");
    expect(chat.status).toBe(200);
    expect(await waiting).toEqual({
      status: 200,
      text: '{"id":1,"type":"request","text":"Improve the start.","decisions":[]}\n',
    });
    expect(await state()).toMatchObject({ working: true });
    expect(await call("/tools/readDocument", "")).toEqual({
      status: 200,
      text: "Version: v0\n---\n# Title\n\nFirst paragraph.\n\nSecond paragraph.\n\n",
    });
    expect(await tool("editText", EDIT)).toEqual({
      status: 200,
      text: "OK. The new version is v1.\n",
    });
    expect(await call("/reply", "The start is better now.")).toEqual({
      status: 200,
      text: "OK. The chat of the editor has your answer.\n",
    });

    // The response of the chat request is the stream of the run: it ends
    // with the answer of the agent.
    const stream = await chat.text();
    expect(stream).toContain('"type":"tool-output-available"');
    expect(stream).toContain("The start is better now.");
    const { messages, proposal, activeRunId } = await snapshot();
    expect(activeRunId).toBeUndefined();
    expect(messages.map((message) => message.role)).toEqual([
      "user",
      "assistant",
    ]);
    // The read of the document makes no change: only the edit is a batch.
    expect(proposal?.batches.map((batch) => batch.source)).toMatchObject([
      { type: "tool-call", reason: "A better first word." },
    ]);
    expect(await state()).toMatchObject({ working: false });
  });

  it("refuses a request of the editor for an agent that does not listen", async () => {
    const { attach, ask, snapshot } = await startServer();

    const unknown = await ask("Improve the start.");
    expect(unknown.status).toBe(409);
    expect(await unknown.json()).toEqual({ error: "agent-not-attached" });
    await attach();
    const silent = await ask("Improve the start.");

    expect(silent.status).toBe(409);
    expect(await silent.json()).toEqual({ error: "agent-not-listening" });
    expect((await snapshot()).messages).toEqual([]);
  });

  it("starts a run for a request that the user wrote in the chat of the agent", async () => {
    const { call, tool, attach, snapshot } = await startServer();
    await attach();

    const started = await call("/requests", "Make the start better.\n");

    expect(started.status).toBe(200);
    expect(started.text).toContain(
      "<document>\nVersion: v0\n---\n# Title\n\nFirst paragraph.",
    );
    expect(await tool("editText", EDIT)).toMatchObject({ status: 200 });
    // A second request before the answer: the agent has an open run.
    expect(await call("/requests", "And the end.")).toEqual({
      status: 409,
      text: "You have an open run on this document. Continue that work, and end it with your answer.\n",
    });
    expect(await call("/reply", "Done.")).toMatchObject({ status: 200 });
    const { messages } = await snapshot();
    expect(messages[0]).toMatchObject({
      role: "user",
      metadata: { origin: "external" },
      parts: [{ type: "text", text: "Make the start better." }],
    });
    expect(messages[1].parts.at(-1)).toMatchObject({
      type: "text",
      text: "Done.",
    });
  });

  it("answers a call that it cannot run with a text and a status", async () => {
    const { call, tool, attach, snapshot } = await startServer();
    await attach();

    expect(await tool("editText", EDIT)).toMatchObject({
      status: 409,
      text: expect.stringContaining("No run is open"),
    });
    expect(await call("/reply", "Done.")).toMatchObject({ status: 409 });
    expect(await call("/requests", " ")).toMatchObject({ status: 400 });
    await call("/requests", "Make the start better.");
    expect(await call("/tools/editText", "{not json")).toEqual({
      status: 400,
      text: "Invalid input: the body must be JSON.\n",
    });
    expect(await tool("Bash", { command: "ls" })).toMatchObject({
      status: 404,
      text: expect.stringContaining("Unknown tool: Bash."),
    });
    expect(await call("/reply", "")).toMatchObject({ status: 400 });
    await call("/reply", "Done.");

    expect((await snapshot()).proposal?.batches ?? []).toEqual([]);
  });

  it("keeps the request of the editor for an agent that closed its request for events", async () => {
    const { link, call, attach, ask, state } = await startServer();
    await attach();
    const gone = new AbortController();
    const closed = fetch(`${link}/events`, { signal: gone.signal }).catch(
      () => "closed",
    );
    while (!(await state()).listening) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    gone.abort();
    expect(await closed).toBe("closed");
    // The server sees the closed connection a short time after the client.
    await new Promise((resolve) => setTimeout(resolve, 100));

    // The agent made a call a short time before: it counts as listening.
    const chat = await ask("Improve the start.");

    expect(await call("/events")).toMatchObject({
      status: 200,
      text: expect.stringContaining('"text":"Improve the start."'),
    });
    await call("/reply", "Done.");
    expect(await chat.text()).toContain("Done.");
  });
});
