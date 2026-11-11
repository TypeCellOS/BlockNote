import type { UIMessage, UIMessageChunk } from "ai";
import { describe, expect, it } from "vite-plus/test";

import {
  DOCUMENT_BATCHES_CHUNK,
  DOCUMENT_PROPOSAL_CHUNK,
  type DocumentBatchesData,
  type DocumentProposalData,
} from "../agent/earlyToolCalls.js";
import { headlessEditorFactory, openProposal } from "../proposal/proposal.js";
import { revertToolCall } from "../proposal/review.js";
import type { Proposal } from "../proposal/types.js";
import { createInMemoryDocumentStore } from "../stores/documentSource.js";
import { createInMemoryProposalStore } from "../stores/proposalStore.js";
import {
  documentOf,
  initialDocument,
  scriptedModel,
  type ScriptedStep,
  textsOf,
} from "../testUtil.js";
import { createSessionHost } from "./sessionHost.js";

const createEditor = headlessEditorFactory();

const firstEdit: ScriptedStep = {
  toolCalls: [
    {
      toolName: "editText",
      input: { old: "First", new: "Opening", reason: "A better word." },
    },
  ],
};
const secondEdit: ScriptedStep = {
  toolCalls: [
    {
      toolName: "editText",
      input: { old: "Second", new: "Closing", reason: "It is the end." },
    },
  ],
};

/** A host with one document `doc`, and a model that plays the script. */
function createHost(
  script: Parameters<typeof scriptedModel>[0],
  modelOptions?: Parameters<typeof scriptedModel>[1],
) {
  const documents = createInMemoryDocumentStore();
  documents.write("doc", initialDocument());
  const changes: string[] = [];
  const { model, prompts } = scriptedModel(script, modelOptions);
  const host = createSessionHost({
    model,
    createEditor,
    proposals: createInMemoryProposalStore(),
    readMain: (documentId) => documents.read(documentId),
    onChange: (documentId) => changes.push(documentId),
  });
  return { host, documents, changes, prompts };
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

/** Starts a run, and waits for its end. */
async function run(
  host: ReturnType<typeof createHost>["host"],
  prompt: string,
  origin: "user" | "external",
) {
  const started = await host.startRun("doc", { prompt, origin });
  if (started.error !== undefined) {
    throw new Error(`The run did not start: ${started.error}`);
  }
  await started.run.done;
  return started.run;
}

function textsOfProposal(proposal: Proposal | undefined): string[] {
  if (proposal === undefined) {
    throw new Error("The session has no proposal");
  }
  return textsOf(openProposal(createEditor, proposal).editor.document);
}

/** The role, the origin and the text of each message of a chat. */
function summaryOf(messages: UIMessage[]) {
  return messages.map((message) => [
    message.role,
    (message.metadata as { origin?: string } | undefined)?.origin,
    message.parts.flatMap((part) => (part.type === "text" ? [part.text] : [])),
  ]);
}

describe("the session of a document", () => {
  it("has one proposal: a run of a user and a run from outside write to it", async () => {
    const { host } = createHost([
      firstEdit,
      { text: "I changed the first word." },
      secondEdit,
      { text: "I changed the second word." },
    ]);

    await run(host, "Improve the start.", "user");
    await run(host, "Improve the end.", "external");

    const snapshot = await host.snapshot("doc");
    expect(snapshot.activeRunId).toBeUndefined();
    expect(snapshot.proposal?.batches.map((batch) => batch.source)).toEqual([
      { type: "tool-call", toolCallId: "call-1", reason: "A better word." },
      { type: "tool-call", toolCallId: "call-2", reason: "It is the end." },
    ]);
    expect(textsOfProposal(snapshot.proposal)).toEqual([
      "Title",
      "Opening paragraph.",
      "Closing paragraph.",
    ]);
    // The chat has each request with its origin, and each answer.
    expect(summaryOf(snapshot.messages)).toEqual([
      ["user", "user", ["Improve the start."]],
      ["assistant", undefined, ["I changed the first word."]],
      ["user", "external", ["Improve the end."]],
      ["assistant", undefined, ["I changed the second word."]],
    ]);
  });

  it("gives the agent the chat of the document, and the proposal document", async () => {
    const { host, prompts } = createHost([
      firstEdit,
      { text: "Done." },
      { text: "The first word is now Opening." },
    ]);
    await run(host, "Improve the start.", "user");

    await run(host, "What did you change?", "external");

    // The second run has the first request, the tool call and the answer.
    const roles = prompts[2].map((message) => message.role);
    expect(roles).toEqual([
      "system",
      "user",
      "assistant",
      "tool",
      "assistant",
      "user",
    ]);
    expect(JSON.stringify(prompts[2].at(-1))).toContain(
      "Version: v1\\n---\\n# Title\\n\\nOpening paragraph.",
    );
  });

  it("gives a client that comes after the run the full stream, with the proposal first", async () => {
    const { host } = createHost([firstEdit, { text: "Done." }]);
    const log = await run(host, "Improve the start.", "user");

    const chunks = await chunksOf(log.follow());

    const types = chunks.map((chunk) => chunk.type);
    expect(types.slice(0, 2)).toEqual(["start", DOCUMENT_PROPOSAL_CHUNK]);
    expect(types).toContain(DOCUMENT_BATCHES_CHUNK);
    expect(types).toContain("tool-output-available");
    expect(types.at(-1)).toBe("finish");
    const proposal = chunks[1] as { data: DocumentProposalData };
    // The proposal of the chunk is the proposal before the run.
    expect(proposal.data.proposal.batches).toEqual([]);
    expect(textsOf(proposal.data.proposal.origin)).toEqual([
      "Title",
      "First paragraph.",
      "Second paragraph.",
    ]);
  });

  it("gives a client that follows during the run the same stream as a client that comes later", async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const { host } = createHost(
      [
        { toolCalls: [...firstEdit.toolCalls, ...secondEdit.toolCalls] },
        { text: "Done." },
      ],
      {
        beforeToolCall: (toolCallId) =>
          toolCallId === "call-2" ? gate : Promise.resolve(),
      },
    );
    const started = await host.startRun("doc", {
      prompt: "Improve the text.",
      origin: "external",
    });
    if (started.error !== undefined) {
      throw new Error(started.error);
    }

    // The client follows while the model waits before its second call.
    const during = chunksOf(started.run.follow());
    expect(host.activeRun("doc")).toBe(started.run);
    release();
    await started.run.done;

    expect(await during).toEqual(await chunksOf(started.run.follow()));
    expect(host.activeRun("doc")).toBeUndefined();
  });

  it("puts the rebase of the start of a run after the proposal in the stream", async () => {
    const { host, documents } = createHost([
      firstEdit,
      { text: "Done." },
      { text: "It has a new first paragraph." },
    ]);
    await run(host, "Improve the start.", "user");
    // A user changes the main document between two runs.
    documents.write(
      "doc",
      documentOf([
        { id: "title", type: "heading", content: "Title" },
        { id: "p1", type: "paragraph", content: "First paragraph." },
        { id: "p2", type: "paragraph", content: "Second paragraph, changed." },
      ]),
    );

    const log = await run(host, "What does the document say?", "user");

    const chunks = await chunksOf(log.follow());
    const types = chunks.map((chunk) => chunk.type);
    expect(types.slice(0, 3)).toEqual([
      "start",
      DOCUMENT_PROPOSAL_CHUNK,
      DOCUMENT_BATCHES_CHUNK,
    ]);
    const proposal = chunks[1] as { data: DocumentProposalData };
    const rebase = chunks[2] as { data: DocumentBatchesData };
    expect(proposal.data.proposal.batches).toHaveLength(1);
    expect(rebase.data.toolCallId).toBeUndefined();
    expect(
      rebase.data.batches.map((batch) => [batch.seq, batch.source.type]),
    ).toEqual([[2, "rebase"]]);
    expect(textsOfProposal((await host.snapshot("doc")).proposal)).toEqual([
      "Title",
      "Opening paragraph.",
      "Second paragraph, changed.",
    ]);
  });

  it("has one run at a time for a document", async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const { host, changes } = createHost([firstEdit, { text: "Done." }], {
      beforeToolCall: () => gate,
    });
    const first = await host.startRun("doc", {
      prompt: "Improve the start.",
      origin: "user",
    });
    if (first.error !== undefined) {
      throw new Error(first.error);
    }

    expect(
      await host.startRun("doc", { prompt: "A second.", origin: "external" }),
    ).toEqual({ error: "run-active" });
    expect((await host.snapshot("doc")).activeRunId).toBe(first.run.id);
    release();
    await first.run.done;

    // The host tells the editors at the start and at the end of the run.
    expect(changes).toEqual(["doc", "doc"]);
    expect(summaryOf((await host.snapshot("doc")).messages)).toHaveLength(2);
  });

  it("gives an error for a document that the source does not have", async () => {
    const { host } = createHost([]);

    expect(
      await host.startRun("other", { prompt: "Hello.", origin: "user" }),
    ).toEqual({ error: "unknown-document" });
  });

  it("adds the review of a user to the proposal, and refuses a stale batch", async () => {
    const { host } = createHost([firstEdit, { text: "Done." }]);
    await run(host, "Improve the start.", "user");
    const { proposal } = await host.snapshot("doc");
    const reverted = revertToolCall(createEditor, proposal!, "call-1");
    if (reverted.error !== undefined) {
      throw new Error(reverted.error);
    }

    expect(await host.review("doc", reverted.batch)).toEqual({});
    expect(await host.review("doc", reverted.batch)).toEqual({
      error: "stale",
      batches: 2,
    });

    expect(textsOfProposal((await host.snapshot("doc")).proposal)).toEqual([
      "Title",
      "First paragraph.",
      "Second paragraph.",
    ]);
  });

  it("starts a new proposal after a user closed the proposal, and keeps the chat", async () => {
    const { host, documents } = createHost([
      firstEdit,
      { text: "Done." },
      secondEdit,
      { text: "Done again." },
    ]);
    await run(host, "Improve the start.", "user");
    // The user accepts: the main document has the change, and the proposal
    // closes.
    documents.write(
      "doc",
      documentOf([
        { id: "title", type: "heading", content: "Title" },
        { id: "p1", type: "paragraph", content: "Opening paragraph." },
        { id: "p2", type: "paragraph", content: "Second paragraph." },
      ]),
    );
    host.closeProposal("doc");
    expect((await host.snapshot("doc")).proposal).toBeUndefined();
    expect(await host.review("doc", {} as never)).toEqual({
      error: "no-proposal",
    });

    await run(host, "Improve the end.", "external");

    const snapshot = await host.snapshot("doc");
    expect(textsOf(snapshot.proposal!.origin)).toEqual([
      "Title",
      "Opening paragraph.",
      "Second paragraph.",
    ]);
    expect(snapshot.proposal!.batches).toHaveLength(1);
    expect(snapshot.messages).toHaveLength(4);
  });
});
