import type { UIMessage, UIMessageChunk } from "ai";
import { describe, expect, it } from "vite-plus/test";

import {
  createProposal,
  headlessEditorFactory,
  openProposal,
  withBatch,
} from "../proposal/proposal.js";
import type { Batch, Proposal } from "../proposal/types.js";
import { createInMemoryDocumentStore } from "../stores/documentSource.js";
import { createInMemoryProposalStore } from "../stores/proposalStore.js";
import {
  documentOf,
  initialDocument,
  type LanguageModelV4Prompt,
  lastToolResult,
  scriptedModel,
  textsOf,
  versionIn,
} from "../testUtil.js";
import { createDocumentHandle, type DocumentHandle } from "../tools/handle.js";
import { createToolCalls } from "../tools/toolCalls.js";
import { runDocumentAgent, streamDocumentAgent } from "./documentAgent.js";
import {
  DOCUMENT_BATCHES_CHUNK,
  type DocumentBatchesData,
} from "./earlyToolCalls.js";

const createEditor = headlessEditorFactory();

function userMessage(text: string): UIMessage {
  return { id: "m1", role: "user", parts: [{ type: "text", text }] };
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

/** The texts of each message of a user in a prompt of the mock model. */
function userTexts(prompt: LanguageModelV4Prompt): string[][] {
  return prompt.flatMap((message) =>
    message.role === "user"
      ? [
          message.content.flatMap((part) =>
            part.type === "text" ? [part.text] : [],
          ),
        ]
      : [],
  );
}

/** The document of `initialDocument`, as the first LLM call gets it. */
const INITIAL_DOCUMENT =
  "<document>\nVersion: v0\n---\n# Title\n\nFirst paragraph.\n\nSecond paragraph.\n\n</document>";

/** The batches in the tool outputs of a UI message stream, in sequence. */
function batchesIn(chunks: UIMessageChunk[]): Batch[] {
  return chunks.flatMap((chunk) =>
    chunk.type === "tool-output-available"
      ? ((chunk.output as { batches?: Batch[] }).batches ?? [])
      : [],
  );
}

describe("a run that a user starts", () => {
  /** The agent reads, makes two edits with different reasons, and answers. */
  function editingModel() {
    return scriptedModel([
      { toolCalls: [{ toolName: "readDocument", input: {} }] },
      {
        toolCalls: [
          {
            toolName: "editText",
            input: { old: "First", new: "Opening", reason: "A better word." },
          },
        ],
      },
      (prompt) => ({
        toolCalls: [
          {
            toolName: "writeDocument",
            input: {
              markdown:
                "# Title\n\nOpening paragraph.\n\nSecond paragraph.\n\nA closing paragraph.\n",
              base: versionIn(lastToolResult(prompt)),
              reason: "The document needs an end.",
            },
          },
        ],
      }),
      { text: "I changed a word and added a closing paragraph." },
    ]);
  }

  it("runs the loop: each tool result goes back to the model", async () => {
    const { model, prompts } = editingModel();
    const proposal = createProposal(initialDocument());

    await chunksOf(
      await streamDocumentAgent(
        { messages: [userMessage("Improve the text.")], proposal },
        { model, createEditor },
      ),
    );

    // Four LLM calls. The model gets a short text for each tool result.
    expect(prompts).toHaveLength(4);
    expect(lastToolResult(prompts[1])).toBe(
      "Version: v0\n---\n# Title\n\nFirst paragraph.\n\nSecond paragraph.\n",
    );
    expect(lastToolResult(prompts[2])).toBe("OK. The new version is v1.");
    expect(lastToolResult(prompts[3])).toBe("OK. The new version is v2.");
    // The model never gets the operations.
    expect(JSON.stringify(prompts)).not.toContain("operations");
  });

  it("streams one batch for each editing tool call, and the client gets the same document", async () => {
    const { model } = editingModel();
    const proposal = createProposal(initialDocument());

    const chunks = await chunksOf(
      await streamDocumentAgent(
        { messages: [userMessage("Improve the text.")], proposal },
        { model, createEditor },
      ),
    );
    const batches = batchesIn(chunks);

    expect(batches.map((batch) => [batch.seq, batch.source])).toEqual([
      [
        1,
        { type: "tool-call", toolCallId: "call-2", reason: "A better word." },
      ],
      [
        2,
        {
          type: "tool-call",
          toolCallId: "call-3",
          reason: "The document needs an end.",
        },
      ],
    ]);
    // The client applies the batches to its copy of the proposal. The
    // replay examines the hash of the last batch.
    const client = batches.reduce(withBatch, proposal);
    expect(textsOf(openProposal(createEditor, client).editor.document)).toEqual(
      [
        "Title",
        "Opening paragraph.",
        "Second paragraph.",
        "A closing paragraph.",
      ],
    );
    // The answer of the agent comes as text.
    expect(
      chunks.flatMap((chunk) =>
        chunk.type === "text-delta" ? [chunk.delta] : [],
      ),
    ).toEqual(["I changed a word and added a closing paragraph."]);
  });

  it("continues from the proposal that the client sends", async () => {
    const first = editingModel();
    const proposal = batchesIn(
      await chunksOf(
        await streamDocumentAgent(
          {
            messages: [userMessage("Improve the text.")],
            proposal: createProposal(initialDocument()),
          },
          { model: first.model, createEditor },
        ),
      ),
    ).reduce(withBatch, createProposal(initialDocument()));

    // The next request has no state on the host: the proposal comes with it.
    const second = scriptedModel([
      { toolCalls: [{ toolName: "readDocument", input: {} }] },
      { text: "Done." },
    ]);
    await chunksOf(
      await streamDocumentAgent(
        { messages: [userMessage("What does the document say?")], proposal },
        { model: second.model, createEditor },
      ),
    );

    expect(lastToolResult(second.prompts[1])).toBe(
      "Version: v2\n---\n# Title\n\nOpening paragraph.\n\nSecond paragraph.\n\nA closing paragraph.\n",
    );
  });

  it("gives the model an error value, and the model corrects its call", async () => {
    const { model, prompts } = scriptedModel([
      {
        toolCalls: [
          {
            toolName: "editText",
            input: { old: "paragraph", new: "sentence", reason: "r" },
          },
        ],
      },
      {
        toolCalls: [
          {
            toolName: "editText",
            input: {
              old: "First paragraph",
              new: "First sentence",
              reason: "r",
            },
          },
        ],
      },
      { text: "Done." },
    ]);

    const chunks = await chunksOf(
      await streamDocumentAgent(
        {
          messages: [userMessage("Change the first paragraph.")],
          proposal: createProposal(initialDocument()),
        },
        { model, createEditor },
      ),
    );

    expect(lastToolResult(prompts[1])).toContain("Not unique");
    expect(lastToolResult(prompts[2])).toBe("OK. The new version is v1.");
    expect(batchesIn(chunks)).toHaveLength(1);
  });
});

describe("a tool that throws", () => {
  /**
   * A handle of a host that breaks during the run: the first step (the
   * read of the document for the first LLM call) works, and each later
   * step throws.
   */
  async function handleThatBreaks(): Promise<DocumentHandle> {
    const store = createInMemoryProposalStore();
    await store.save("run", createProposal(initialDocument()));
    const handle = createDocumentHandle({
      store,
      proposalId: "run",
      createEditor,
    });
    let steps = 0;
    return {
      createEditor,
      update(step) {
        return steps++ === 0
          ? handle.update(step)
          : Promise.reject(new Error("The store is not available"));
      },
    };
  }
  const script = [
    { toolCalls: [{ toolName: "readDocument", input: {} }] },
    { text: "The model must not get this step." },
  ];

  it("stops the loop and fails the run: an exception is a bug, not a result for the model", async () => {
    const { model, prompts } = scriptedModel(script);

    await expect(
      runDocumentAgent(await handleThatBreaks(), "Read the document.", {
        model,
      }),
    ).rejects.toThrow("The store is not available");
    expect(prompts).toHaveLength(1);
  });
});

describe("the document in the first LLM call", () => {
  const edit = {
    toolCalls: [
      {
        toolName: "editText",
        input: { old: "First", new: "Opening", reason: "A better word." },
      },
    ],
  };

  it("gives the document before the request of the user, thus the model does not read first", async () => {
    const { model, prompts } = scriptedModel([edit, { text: "Done." }]);

    const chunks = await chunksOf(
      await streamDocumentAgent(
        {
          messages: [userMessage("Improve the text.")],
          proposal: createProposal(initialDocument()),
        },
        { model, createEditor },
      ),
    );

    // Two LLM calls: the edit and the answer. There is no call for a read.
    expect(prompts).toHaveLength(2);
    expect(userTexts(prompts[0])).toEqual([
      [INITIAL_DOCUMENT, "Improve the text."],
    ]);
    expect(batchesIn(chunks)).toHaveLength(1);
  });

  it("keeps the same document text in each LLM call of the run", async () => {
    // A prompt cache of the provider needs the same text at the same place.
    const { model, prompts } = scriptedModel([edit, { text: "Done." }]);

    await chunksOf(
      await streamDocumentAgent(
        {
          messages: [userMessage("Improve the text.")],
          proposal: createProposal(initialDocument()),
        },
        { model, createEditor },
      ),
    );

    expect(userTexts(prompts[1])).toEqual(userTexts(prompts[0]));
    expect(lastToolResult(prompts[1])).toBe("OK. The new version is v1.");
  });

  it("gives the current document only to the last message of a chat", async () => {
    const first = scriptedModel([edit, { text: "Done." }]);
    const proposal = batchesIn(
      await chunksOf(
        await streamDocumentAgent(
          {
            messages: [userMessage("Improve the text.")],
            proposal: createProposal(initialDocument()),
          },
          { model: first.model, createEditor },
        ),
      ),
    ).reduce(withBatch, createProposal(initialDocument()));

    const second = scriptedModel([{ text: "It has two paragraphs." }]);
    await chunksOf(
      await streamDocumentAgent(
        {
          messages: [
            userMessage("Improve the text."),
            {
              id: "m2",
              role: "assistant",
              parts: [{ type: "text", text: "Done." }],
            },
            { ...userMessage("What does the document say?"), id: "m3" },
          ],
          proposal,
        },
        { model: second.model, createEditor },
      ),
    );

    // The first request has no document: its document is old.
    expect(userTexts(second.prompts[0])).toEqual([
      ["Improve the text."],
      [
        "<document>\nVersion: v1\n---\n# Title\n\nOpening paragraph.\n\nSecond paragraph.\n\n</document>",
        "What does the document say?",
      ],
    ]);
  });

  it("gives the document to a run without a chat", async () => {
    const store = createInMemoryProposalStore();
    await store.save("run", createProposal(initialDocument()));
    const handle = createDocumentHandle({
      store,
      proposalId: "run",
      createEditor,
    });
    const { model, prompts } = scriptedModel([edit, { text: "Done." }]);

    const run = await runDocumentAgent(handle, "Improve the text.", { model });

    expect(run.steps).toBe(2);
    expect(userTexts(prompts[0])).toEqual([
      [INITIAL_DOCUMENT, "Improve the text."],
    ]);
  });

  it("gives the main document of now to a run that a server starts, without the note of a change", async () => {
    // A user changed the main document after the proposal started. The
    // read for the first LLM call rebases the proposal.
    const documents = createInMemoryDocumentStore();
    documents.write(
      "doc",
      documentOf([
        { id: "title", type: "heading", content: "Title" },
        { id: "p1", type: "paragraph", content: "Paragraph one, by the user." },
        { id: "p2", type: "paragraph", content: "Second paragraph." },
      ]),
    );
    const store = createInMemoryProposalStore();
    await store.save("run", createProposal(initialDocument()));
    const handle = createDocumentHandle({
      store,
      proposalId: "run",
      createEditor,
      readMain: () => documents.read("doc"),
    });
    const { model, prompts } = scriptedModel([{ text: "Done." }]);

    await runDocumentAgent(handle, "What does the document say?", { model });

    const [[document]] = userTexts(prompts[0]);
    expect(document).toContain("Paragraph one, by the user.");
    expect(document).not.toContain("Note:");
    expect(
      (await store.load("run"))!.batches.map((batch) => batch.source.type),
    ).toEqual(["rebase"]);
  });
});

describe("a run that a server starts", () => {
  it("rebases on each tool call: the agent sees an edit of a user between two calls, and reads again after a conflict", async () => {
    const documents = createInMemoryDocumentStore();
    documents.write("doc", initialDocument());
    const store = createInMemoryProposalStore();
    await store.save("run", createProposal(initialDocument()));
    const handle = createDocumentHandle({
      store,
      proposalId: "run",
      createEditor,
      readMain: () => documents.read("doc"),
    });

    const { model, prompts } = scriptedModel([
      { toolCalls: [{ toolName: "readDocument", input: {} }] },
      (prompt) => {
        // A user changes the first paragraph while the model writes.
        documents.write(
          "doc",
          documentOf([
            { id: "title", type: "heading", content: "Title" },
            {
              id: "p1",
              type: "paragraph",
              content: "Paragraph one, by the user.",
            },
            { id: "p2", type: "paragraph", content: "Second paragraph." },
          ]),
        );
        return {
          toolCalls: [
            {
              toolName: "writeDocument",
              input: {
                markdown:
                  "# Title\n\nThe first paragraph.\n\nThe second paragraph.\n",
                base: versionIn(lastToolResult(prompt)),
                reason: "Add articles.",
              },
            },
          ],
        };
      },
      // The write is in conflict with the edit of the user: read again.
      { toolCalls: [{ toolName: "readDocument", input: {} }] },
      (prompt) => ({
        toolCalls: [
          {
            toolName: "writeDocument",
            input: {
              markdown:
                "# Title\n\nParagraph one, by the user.\n\nThe second paragraph.\n",
              base: versionIn(lastToolResult(prompt)),
              reason: "Add an article.",
            },
          },
        ],
      }),
      { text: "Done." },
    ]);

    const run = await runDocumentAgent(handle, "Add articles.", { model });

    expect(run).toMatchObject({ text: "Done.", steps: 5 });
    expect(lastToolResult(prompts[2])).toContain("Conflict");
    expect(lastToolResult(prompts[3])).toContain("Paragraph one, by the user.");
    expect(lastToolResult(prompts[4])).toBe("OK. The new version is v2.");

    const proposal: Proposal = (await store.load("run"))!;
    expect(proposal.batches.map((batch) => batch.source.type)).toEqual([
      "rebase",
      "tool-call",
    ]);
    expect(
      textsOf(openProposal(createEditor, proposal).editor.document),
    ).toEqual([
      "Title",
      "Paragraph one, by the user.",
      "The second paragraph.",
    ]);
    // The main document did not change: only a user accepts.
    expect(textsOf((await documents.read("doc"))!)).toEqual([
      "Title",
      "Paragraph one, by the user.",
      "Second paragraph.",
    ]);
  });
});

describe("a tool call starts when the model has written it", () => {
  const firstEdit = {
    toolName: "editText",
    input: { old: "First", new: "Opening", reason: "A better word." },
  };
  const secondEdit = {
    toolName: "editText",
    input: { old: "Second", new: "Closing", reason: "It is the end." },
  };

  it("gives the client the batch of a call before the model writes the next call of the same step", async () => {
    // The model writes two tool calls in one LLM step. It waits before the
    // second call until the client has the batch of the first call. Without
    // the early start, the loop of the AI SDK runs the two tools only at
    // the end of the step, and this test does not end.
    let seen: () => void = () => undefined;
    const firstBatch = new Promise<void>((resolve) => {
      seen = resolve;
    });
    const { model, prompts } = scriptedModel(
      [{ toolCalls: [firstEdit, secondEdit] }, { text: "Done." }],
      {
        beforeToolCall: (toolCallId) =>
          toolCallId === "call-2" ? firstBatch : Promise.resolve(),
      },
    );

    const stream = await streamDocumentAgent(
      {
        messages: [userMessage("Improve the text.")],
        proposal: createProposal(initialDocument()),
      },
      { model, createEditor },
    );
    const chunks: UIMessageChunk[] = [];
    const reader = stream.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      chunks.push(value);
      if (value.type === DOCUMENT_BATCHES_CHUNK) {
        seen();
      }
    }

    function indexOf(type: string, toolCallId: string): number {
      return chunks.findIndex(
        (chunk) =>
          chunk.type === type &&
          (chunk.type === DOCUMENT_BATCHES_CHUNK
            ? (chunk.data as DocumentBatchesData).toolCallId
            : "toolCallId" in chunk && chunk.toolCallId) === toolCallId,
      );
    }
    const early = indexOf(DOCUMENT_BATCHES_CHUNK, "call-1");
    expect(early).toBeGreaterThan(-1);
    expect(early).toBeLessThan(indexOf("tool-input-available", "call-2"));
    expect(indexOf("tool-input-available", "call-2")).toBeLessThan(
      indexOf("tool-output-available", "call-1"),
    );

    // The data chunk and the tool output have the same batch. The chunk is
    // transient: it is not a part of the chat message.
    const earlyChunk = chunks[early] as {
      data: DocumentBatchesData;
      transient?: boolean;
    };
    expect(earlyChunk.transient).toBe(true);
    expect(earlyChunk.data.batches).toEqual(batchesIn(chunks).slice(0, 1));
    expect(batchesIn(chunks).map((batch) => batch.seq)).toEqual([1, 2]);
    // Each tool ran one time: the model got one result for each call.
    expect(prompts).toHaveLength(2);
    expect(lastToolResult(prompts[1])).toBe("OK. The new version is v2.");
  });

  it("runs a tool call one time for one tool call ID", async () => {
    const store = createInMemoryProposalStore();
    await store.save("run", createProposal(initialDocument()));
    const handle = createDocumentHandle({
      store,
      proposalId: "run",
      createEditor,
    });
    const batches: [string | undefined, number[]][] = [];
    const calls = createToolCalls(handle, (added, toolCallId) =>
      batches.push([toolCallId, added.map((batch) => batch.seq)]),
    );

    // The early start, then the loop of the AI SDK, ask for the same call.
    const early = calls.run("editText", firstEdit.input, "call-1");
    const fromLoop = calls.run("editText", firstEdit.input, "call-1");
    const other = calls.run("editText", secondEdit.input, "call-2");

    expect(fromLoop).toBe(early);
    expect(await early).toMatchObject({ version: "v1", changed: true });
    expect(await other).toMatchObject({ version: "v2", changed: true });
    expect((await store.load("run"))!.batches).toHaveLength(2);
    expect(batches).toEqual([
      ["call-1", [1]],
      ["call-2", [2]],
    ]);
  });
});
