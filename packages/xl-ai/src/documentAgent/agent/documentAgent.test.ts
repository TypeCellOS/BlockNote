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
  lastToolResult,
  scriptedModel,
  textsOf,
  versionIn,
} from "../testUtil.js";
import { createDocumentHandle } from "../tools/handle.js";
import { runDocumentAgent, streamDocumentAgent } from "./documentAgent.js";

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
