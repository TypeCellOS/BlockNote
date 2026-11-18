import type { UIMessage, UIMessageChunk } from "ai";
import { afterEach, describe, expect, it } from "vite-plus/test";

import {
  DOCUMENT_BATCHES_CHUNK,
  DOCUMENT_PROPOSAL_CHUNK,
} from "../proposal/chunks.js";
import { headlessEditorFactory, openProposal } from "../proposal/proposal.js";
import { revertToolCall } from "../proposal/review.js";
import { createSessionHost } from "../sessions/sessionHost.js";
import { createInMemoryDocumentStore } from "../stores/documentSource.js";
import { createInMemoryProposalStore } from "../stores/proposalStore.js";
import {
  initialDocument,
  scriptedModel,
  type ScriptedStep,
  textsOf,
} from "../testUtil.js";
import type { AgentDocument } from "../tools/agentDocument.js";
import { keepSuggestionCurrent } from "../yjs14/suggestionDocument.js";
import { createSuggestionSessionHost } from "../yjs14/suggestionSessions.js";
import {
  FRAGMENT,
  initialMain,
  suggestionReplicaOf,
  textsOfDoc,
} from "../yjs14/testUtil.js";
import { toolCallRecordsOf } from "../yjs14/toolCallRecords.js";
import {
  type AttachedAgents,
  type AttachedAgentsOptions,
  createAttachedAgents,
} from "./attachedAgents.js";

// The tests of the attached agents. The test plays the agent: it makes the
// calls that an agent of a user makes through a door of the host. There is
// no process, no transport and no model. The sessions, the stores and the
// documents are the real code of each mode.

// jsdom has no layout: it does not have `scrollIntoView`.
Element.prototype.scrollIntoView = function scrollIntoView() {
  // No scroll in jsdom.
};

const createEditor = headlessEditorFactory();

const cleanups: (() => void)[] = [];
afterEach(() => {
  while (cleanups.length) {
    cleanups.pop()?.();
  }
});

/** The agent of the tests: the agent of one user, on the document `doc`. */
const AGENT = { document: "doc", token: "token-of-the-user" };

const OPENING =
  "<document>\nVersion: v0\n---\n# Title\n\nFirst paragraph.\n\nSecond paragraph.\n\n</document>";

/** A host in proposal mode with one document `doc`, and a model that plays the script. */
function createProposalHost(script: ScriptedStep[] = []) {
  const documents = createInMemoryDocumentStore();
  documents.write("doc", initialDocument());
  const { model, prompts } = scriptedModel(script);
  const host = createSessionHost({
    model,
    createEditor,
    proposals: createInMemoryProposalStore(),
    readMain: (documentId) => documents.read(documentId),
  });
  return { host, documents, prompts };
}

type Host = Pick<ReturnType<typeof createProposalHost>["host"], "startRun">;

/** The attached agents of a host, with the agent of the tests attached. */
function attachedAgents(options?: AttachedAgentsOptions) {
  const agents = createAttachedAgents(options);
  agents.attach(AGENT);
  return agents;
}

/**
 * Starts a run for a request that a user wrote in the chat of an editor,
 * and waits until the run is open: the agent has its event then.
 */
async function startFromEditor(
  host: Host,
  agents: AttachedAgents,
  prompt: string,
) {
  const { loop, opening } = agents.run(AGENT, "editor");
  const started = await host.startRun("doc", {
    prompt,
    origin: "user",
    loop,
  });
  if (started.error !== undefined) {
    throw new Error(`The run did not start: ${started.error}`);
  }
  await opening;
  return started.run;
}

/** Starts a run for a request that the user wrote in the chat of the agent. */
async function startFromAgent(
  host: Host,
  agents: AttachedAgents,
  prompt: string,
) {
  const { loop, opening } = agents.run(AGENT, "agent");
  const started = await host.startRun("doc", {
    prompt,
    origin: "external",
    loop,
  });
  if (started.error !== undefined) {
    throw new Error(`The run did not start: ${started.error}`);
  }
  return { run: started.run, opening: await opening };
}

/** Starts a run with the built-in loop. */
async function startBuiltIn(host: Host, prompt: string) {
  const started = await host.startRun("doc", { prompt, origin: "user" });
  if (started.error !== undefined) {
    throw new Error(`The run did not start: ${started.error}`);
  }
  return started.run;
}

function nextEvent(agents: AttachedAgents) {
  return agents.nextEvent(AGENT, new AbortController().signal);
}

function edit(agents: AttachedAgents, old: string, replacement: string) {
  return agents.callTool(AGENT, "editText", {
    old,
    new: replacement,
    reason: `Replaces ${old}`,
  });
}

async function chunksOf(
  stream: ReadableStream<UIMessageChunk>,
): Promise<UIMessageChunk[]> {
  const chunks: UIMessageChunk[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      return chunks;
    }
    chunks.push(value);
  }
}

/** Each part of a message, as a short text. The ID of a tool call is not in it: the host makes it. */
function partsOf(message: UIMessage | undefined): string[] {
  return (message?.parts ?? []).map((part) => {
    if (part.type === "text") {
      return `text: ${part.text}`;
    }
    return "state" in part ? `${part.type} ${part.state}` : part.type;
  });
}

describe("an attached agent in a session of proposal mode", () => {
  it("gets the request of an editor as an event, and writes its changes and its answer into the run", async () => {
    const { host, prompts } = createProposalHost();
    const agents = attachedAgents();

    const run = await startFromEditor(host, agents, "Improve the start.");
    expect(await nextEvent(agents)).toEqual({
      event: {
        id: 1,
        type: "request",
        text: "Improve the start.",
        document: OPENING,
        decisions: [],
      },
    });
    expect(await edit(agents, "First", "Opening")).toEqual({
      text: "OK. The new version is v1.",
    });
    // An expected failure of a tool is a value: the agent gets its text.
    expect(await edit(agents, "Missing", "Other")).toEqual({
      text: "Not found: nothing was written. The markdown of the document does not contain `old`. Call readDocument to see the current text, and copy `old` from it exactly.",
    });
    expect(await agents.reply(AGENT, "Done.")).toEqual({
      text: "OK. The chat of the editor has your answer.",
    });
    await run.done;

    const snapshot = await host.snapshot("doc");
    expect(snapshot.activeRunId).toBeUndefined();
    // The change is a batch of the tool call of the agent.
    expect(snapshot.proposal?.batches.map((batch) => batch.source)).toEqual([
      {
        type: "tool-call",
        toolCallId: expect.stringMatching(/^call_/),
        reason: "Replaces First",
      },
    ]);
    expect(
      textsOf(openProposal(createEditor, snapshot.proposal!).editor.document),
    ).toEqual(["Title", "Opening paragraph.", "Second paragraph."]);
    // The chat has the request and the message of the agent: each tool
    // call with its output, and the answer after the results as a new step.
    expect(snapshot.messages.map((message) => message.role)).toEqual([
      "user",
      "assistant",
    ]);
    expect(partsOf(snapshot.messages[1])).toEqual([
      "step-start",
      "tool-editText output-available",
      "step-start",
      "tool-editText output-available",
      "step-start",
      "text: Done.",
    ]);
    // The model of the host has no part in the run.
    expect(prompts).toEqual([]);
  });

  it("gives the request to an agent that waits for the next event", async () => {
    const { host } = createProposalHost();
    const agents = attachedAgents();
    const waiting = nextEvent(agents);
    expect(agents.stateOf(AGENT)).toEqual({ listening: true, working: false });

    const run = await startFromEditor(host, agents, "Improve the start.");

    expect(await waiting).toMatchObject({
      event: { id: 1, text: "Improve the start." },
    });
    expect(agents.stateOf(AGENT)).toMatchObject({ working: true });
    await agents.reply(AGENT, "Done.");
    await run.done;
    expect(agents.stateOf(AGENT)).toMatchObject({ working: false });
  });

  it("gives no event after the wait time, and then the agent does not listen", async () => {
    const agents = attachedAgents({ waitMs: 5, graceMs: 0 });

    expect(await nextEvent(agents)).toEqual({ event: undefined });

    expect(agents.stateOf(AGENT)).toEqual({ listening: false, working: false });
  });

  it("keeps an event for the next request if the agent went away", async () => {
    const { host } = createProposalHost();
    const agents = attachedAgents();
    const gone = new AbortController();
    const waiting = agents.nextEvent(AGENT, gone.signal);
    gone.abort();
    expect(await waiting).toEqual({ event: undefined });

    const run = await startFromEditor(host, agents, "Improve the start.");

    expect(await nextEvent(agents)).toMatchObject({
      event: { text: "Improve the start." },
    });
    await agents.reply(AGENT, "Done.");
    await run.done;
  });

  it("opens a run for a request that the user wrote in the chat of the agent", async () => {
    const { host } = createProposalHost();
    const agents = attachedAgents({ waitMs: 5 });

    const { run, opening } = await startFromAgent(
      host,
      agents,
      "Make the start shorter.",
    );
    expect(opening).toEqual({ document: OPENING, decisions: [] });
    // The agent has the request: it does not come as an event.
    expect(await nextEvent(agents)).toEqual({ event: undefined });
    await edit(agents, "First paragraph.", "First.");
    await agents.reply(AGENT, "The start is shorter.");
    await run.done;

    const { messages } = await host.snapshot("doc");
    expect(messages[0]).toMatchObject({
      role: "user",
      metadata: { origin: "external" },
      parts: [{ type: "text", text: "Make the start shorter." }],
    });
    expect(partsOf(messages[1])).toEqual([
      "step-start",
      "tool-editText output-available",
      "step-start",
      "text: The start is shorter.",
    ]);
  });

  it("gives the same stream to a client that follows the run and to a client that comes later", async () => {
    const { host } = createProposalHost();
    const agents = attachedAgents();

    const run = await startFromEditor(host, agents, "Improve the start.");
    const during = run.follow().then(chunksOf);
    await nextEvent(agents);
    await edit(agents, "First", "Opening");
    await agents.reply(AGENT, "Done.");
    await run.done;
    const chunks = await chunksOf(await run.follow());

    expect(await during).toEqual(chunks);
    // The stream has the structure of the stream of the built-in loop: the
    // proposal after the start, and the batches of a tool call before its
    // output.
    expect(chunks.map((chunk) => chunk.type)).toEqual([
      "start",
      DOCUMENT_PROPOSAL_CHUNK,
      "start-step",
      "tool-input-start",
      "tool-input-available",
      DOCUMENT_BATCHES_CHUNK,
      "tool-output-available",
      "finish-step",
      "start-step",
      "text-start",
      "text-delta",
      "text-end",
      "finish-step",
      "finish",
    ]);
    expect(chunks[0]).toHaveProperty("messageId");
  });

  it("runs two calls that the agent makes at the same time one after the other", async () => {
    const { host } = createProposalHost();
    const agents = attachedAgents();
    const run = await startFromEditor(host, agents, "Improve the text.");

    const results = await Promise.all([
      edit(agents, "First", "Opening"),
      edit(agents, "Second", "Closing"),
    ]);

    expect(results).toEqual([
      { text: "OK. The new version is v1." },
      { text: "OK. The new version is v2." },
    ]);
    await agents.reply(AGENT, "Done.");
    await run.done;
  });

  it("lets a later run of the built-in loop read the run of the agent", async () => {
    const { host, prompts } = createProposalHost([
      { text: "The first word is now Opening." },
    ]);
    const agents = attachedAgents();
    const run = await startFromEditor(host, agents, "Improve the start.");
    await edit(agents, "First", "Opening");
    await agents.reply(AGENT, "Done.");
    await run.done;

    await (
      await startBuiltIn(host, "What did the agent change?")
    ).done;

    // The model gets the tool call of the attached agent and its result,
    // as for a run of the built-in loop.
    expect(prompts[0].map((message) => message.role)).toEqual([
      "system",
      "user",
      "assistant",
      "tool",
      "assistant",
      "user",
    ]);
    expect(JSON.stringify(prompts[0][3])).toContain(
      "OK. The new version is v1.",
    );
  });

  it("tells the agent the decisions of the users on the changes of the chat, one time", async () => {
    const { host } = createProposalHost([
      {
        toolCalls: [
          {
            toolName: "editText",
            input: { old: "Title", new: "Heading", reason: "A new title." },
          },
        ],
      },
      { text: "Done." },
    ]);
    const agents = attachedAgents();
    const first = await startFromEditor(host, agents, "Improve the text.");
    await edit(agents, "First", "Opening");
    await edit(agents, "Second", "Closing");
    await agents.reply(AGENT, "Done.");
    await first.done;
    // A run of the built-in loop makes a third change.
    await (
      await startBuiltIn(host, "Change the title.")
    ).done;
    // A user rejects the first change, and accepts the rest.
    const { proposal } = await host.snapshot("doc");
    const [firstCall] = proposal!.batches.flatMap((batch) =>
      batch.source.type === "tool-call" ? [batch.source.toolCallId] : [],
    );
    const reverted = revertToolCall(createEditor, proposal!, firstCall);
    if (reverted.error !== undefined) {
      throw new Error(reverted.error);
    }
    await host.review("doc", reverted.batch);
    await host.closeProposal("doc", "accepted");

    const second = await startFromEditor(host, agents, "Continue.");
    // The decision on a change of the built-in loop is there too.
    expect(await nextEvent(agents)).toMatchObject({
      event: {
        text: "Continue.",
        decisions: [
          'The change "Replaces First": The user rejected this change: it is not in the document. Do not make this change again, unless the user asks for it.',
          'The change "Replaces Second": The user accepted this change: it is in the document.',
          'The change "A new title.": The user accepted this change: it is in the document.',
        ],
      },
    });
    await agents.reply(AGENT, "Done.");
    await second.done;

    const third = await startFromEditor(host, agents, "Continue.");
    expect(await nextEvent(agents)).toMatchObject({
      event: { decisions: [] },
    });
    await agents.reply(AGENT, "Done.");
    await third.done;
  });

  it("ends the run when a user stops it, and keeps what the agent did", async () => {
    const { host } = createProposalHost();
    const agents = attachedAgents();
    const run = await startFromEditor(host, agents, "Improve the start.");
    await edit(agents, "First", "Opening");

    await host.stopRun("doc");
    await run.done;

    // The agent learns of the stop from its next call.
    expect(await edit(agents, "Second", "Closing")).toMatchObject({
      error: "no-run",
    });
    expect(await agents.reply(AGENT, "Done.")).toMatchObject({
      error: "no-run",
    });
    const snapshot = await host.snapshot("doc");
    expect(snapshot.activeRunId).toBeUndefined();
    expect(snapshot.proposal?.batches).toHaveLength(1);
    expect(partsOf(snapshot.messages[1])).toEqual([
      "step-start",
      "tool-editText output-available",
    ]);
    // The document can have a new run.
    const next = await startFromEditor(host, agents, "Continue.");
    await agents.reply(AGENT, "Done.");
    await next.done;
  });

  it("does not give the agent a request of a run that ended before the agent got it", async () => {
    const { host } = createProposalHost();
    const agents = attachedAgents({ waitMs: 5 });
    const run = await startFromEditor(host, agents, "Improve the start.");

    await host.stopRun("doc");
    await run.done;

    expect(await nextEvent(agents)).toEqual({ event: undefined });
  });

  it("ends a run that the agent does not end, with a note in the chat", async () => {
    const { host } = createProposalHost();
    const agents = attachedAgents({ idleMs: 20 });

    const run = await startFromEditor(host, agents, "Improve the start.");
    await run.done;

    const { messages, activeRunId } = await host.snapshot("doc");
    expect(activeRunId).toBeUndefined();
    expect(partsOf(messages[1])).toEqual([
      "step-start",
      "text: The agent did not end its work in time.",
    ]);
    expect(await agents.reply(AGENT, "Done.")).toMatchObject({
      error: "no-run",
    });
  });

  it("answers a call that it cannot run with an error, and runs no tool", async () => {
    const { host } = createProposalHost();
    const agents = attachedAgents();
    const stranger = { document: "doc", token: "token-of-a-stranger" };

    // Without a run: the agent must send the request first.
    expect(await edit(agents, "First", "Opening")).toMatchObject({
      error: "no-run",
      text: expect.stringContaining("send the request first"),
    });
    const run = await startFromEditor(host, agents, "Improve the start.");
    expect(await agents.callTool(AGENT, "Bash", { command: "ls" })).toEqual({
      error: "unknown-tool",
      text: "Unknown tool: Bash. The tools are: readDocument, editText, replaceRange, writeDocument.",
    });
    expect(await agents.callTool(AGENT, "editText", "First")).toMatchObject({
      error: "invalid-input",
    });
    expect(await agents.reply(AGENT, " ")).toMatchObject({
      error: "invalid-input",
    });
    // An agent that no user attached has no access, also during a run of
    // the agent of a different user.
    expect(agents.stateOf(stranger)).toBeUndefined();
    expect(await agents.callTool(stranger, "readDocument", {})).toEqual({
      error: "not-attached",
    });
    expect(await agents.reply(stranger, "Done.")).toEqual({
      error: "not-attached",
    });
    expect(
      await agents.nextEvent(stranger, new AbortController().signal),
    ).toEqual({ error: "not-attached" });
    agents.attach(stranger);
    expect(await agents.callTool(stranger, "readDocument", {})).toMatchObject({
      error: "no-run",
    });
    await agents.reply(AGENT, "Done.");
    await run.done;

    expect((await host.snapshot("doc")).proposal?.batches ?? []).toEqual([]);
  });
});

describe("an attached agent in a session of Yjs 14 mode", () => {
  it("writes its changes to the suggestion document", async () => {
    const main = initialMain();
    const suggestion = suggestionReplicaOf(main);
    cleanups.push(keepSuggestionCurrent(main, suggestion));
    const { model, prompts } = scriptedModel([]);
    const host = createSuggestionSessionHost({
      model,
      openSuggestion: async () => ({ suggestion, fragment: FRAGMENT }),
    });
    const agents = attachedAgents();

    const run = await startFromEditor(host, agents, "Improve the start.");
    await nextEvent(agents);
    await edit(agents, "First", "Opening");
    await agents.reply(AGENT, "Done.");
    await run.done;

    // The change is a suggestion: the main document does not have it.
    expect(textsOfDoc(suggestion)).toContain("Opening paragraph.");
    expect(textsOfDoc(main)).toContain("First paragraph.");
    // The review connects the change to the tool call of the agent.
    expect(toolCallRecordsOf(suggestion)).toMatchObject([
      { reason: "Replaces First" },
    ]);
    const { messages } = await host.snapshot("doc");
    expect(partsOf(messages[1])).toEqual([
      "step-start",
      "tool-editText output-available",
      "step-start",
      "text: Done.",
    ]);
    expect(prompts).toEqual([]);
  });
});

describe("the loop of an attached agent", () => {
  const messages: UIMessage[] = [
    { id: "m1", role: "user", parts: [{ type: "text", text: "Change it." }] },
  ];

  it("fails the stream of the run if the read of the document throws", async () => {
    // A document of which each step throws: a bug of a mode.
    const broken: AgentDocument = {
      noStep: {},
      step: () => Promise.reject(new Error("The document is broken")),
    };
    const agents = attachedAgents();
    const { loop, opening } = agents.run(AGENT, "agent");

    await expect(chunksOf(await loop(broken, messages, {}))).rejects.toThrow(
      "The document is broken",
    );

    await expect(opening).rejects.toThrow("The document is broken");
    expect(agents.stateOf(AGENT)).toMatchObject({ working: false });
  });

  it("fails the stream of the run, and the call of the agent, if a tool throws", async () => {
    const working: AgentDocument = {
      noStep: {},
      step: (run) =>
        Promise.resolve({
          result: run({
            markdown: () => "Text",
            read: () => "Text",
            seen: () => "Text",
            version: "v0",
            notes: () => [],
            write: () => {
              throw new Error("The write is broken");
            },
          }),
          extra: {},
        }),
    };
    const agents = attachedAgents();
    const { loop, opening } = agents.run(AGENT, "agent");
    const chunks = chunksOf(await loop(working, messages, {}));
    chunks.catch(() => undefined);
    await opening;

    await expect(
      agents.callTool(AGENT, "writeDocument", {
        markdown: "New text",
        base: "v0",
        reason: "A new text.",
      }),
    ).rejects.toThrow("The write is broken");

    await expect(chunks).rejects.toThrow("The write is broken");
    expect(agents.stateOf(AGENT)).toMatchObject({ working: false });
  });
});
