import {
  type Batch,
  createDocumentHandle,
  createInMemoryDocumentStore,
  createInMemoryProposalStore,
  createProposal,
  type DocumentAgentRequest,
  type DocumentSource,
  headlessEditorFactory,
  type Proposal,
  runDocumentAgent,
  streamDocumentAgent,
} from "@blocknote/xl-ai/server";
import { createUIMessageStreamResponse } from "ai";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";

import { documentAgentModel } from "./models.js";
import {
  createYjsDocumentSource,
  type ProposalNotice,
} from "./yjsDocumentSource.js";

// The routes of the document agent. The loop and the tools are the shared
// code of `@blocknote/xl-ai` (`documentAgent/`). This file is only the
// host: it decides where the proposal lives and how a client gets the
// batches.
//
// - `POST /chat`: a run that a user starts (server mode). The client sends
//   its copy of the proposal with each request, and gets the batches in the
//   UI message stream. The server keeps no state.
// - `POST /runs`: a run that the server starts, on a document that it reads
//   from a document source. The batches go to the proposal store, and the
//   editors of the document get a notice.

export const documentAgentRoute = new Hono();

/** The schema of the documents: the default schema of BlockNote. */
const createEditor = headlessEditorFactory();

/** A full write of a document needs sufficient output tokens. */
const MAX_OUTPUT_TOKENS = 16000;

// ---------------------------------------------------------------------------
// A run that a user starts (server mode)
// ---------------------------------------------------------------------------

documentAgentRoute.post("/chat", async (c) => {
  const request = parseRequest(await c.req.json());
  if (request === undefined) {
    return c.json({ error: "invalid-request" }, 400);
  }
  const selected = documentAgentModel();
  if (selected.error !== undefined) {
    return c.json({ error: selected.error }, 500);
  }
  const stream = await streamDocumentAgent(request, {
    model: selected.model,
    createEditor,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    abortSignal: c.req.raw.signal,
  });
  return createUIMessageStreamResponse({ stream });
});

/** The request of a client: the chat messages and its copy of the proposal. */
function parseRequest(body: unknown): DocumentAgentRequest | undefined {
  if (typeof body !== "object" || body === null) {
    return undefined;
  }
  const { messages, proposal } = body as Partial<DocumentAgentRequest>;
  if (!Array.isArray(messages) || !isProposal(proposal)) {
    return undefined;
  }
  return { messages, proposal };
}

/**
 * Examines only the shape of a proposal. The replay of the proposal
 * examines the hash of its last batch. A production server must also
 * examine each block and each operation against the schema.
 */
function isProposal(value: unknown): value is Proposal {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { origin, batches } = value as Partial<Proposal>;
  return Array.isArray(origin) && Array.isArray(batches);
}

// ---------------------------------------------------------------------------
// A run that the server starts
// ---------------------------------------------------------------------------

/** The two document sources: an in-memory JSON store, and a Yjs collaboration server. */
type SourceName = "json" | "yjs";

/** The state of a run that the server started. It is in a store, as the proposal. */
type Run = {
  documentId: string;
  source: SourceName;
  status: "running" | "done" | "failed";
  /** The text that the agent wrote at the end of the run. */
  answer: string;
};

// The stores of this demo server are in memory. A production server uses a
// database: the server keeps no editor and no document between two calls.
const documents = createInMemoryDocumentStore();
const proposals = createInMemoryProposalStore();
const runs = new Map<string, Run>();
const yjs = createYjsDocumentSource({
  // The Yjs relay of this server (see `routes/yjsRelay.ts`).
  url:
    process.env.YJS_URL ??
    `http://localhost:${process.env.PORT ?? 3000}/ai/yjs`,
  fragment: "document-store",
});
const sources: Record<SourceName, DocumentSource> = { json: documents, yjs };

/** The listeners of the notices of each document of the JSON store (server-sent events). */
const listeners = new Map<string, Set<(notice: Notice) => void>>();

type Notice = ProposalNotice & { proposalId: string };

/** Tells the editors of the document that the proposal changed. */
async function notify(proposalId: string) {
  const run = runs.get(proposalId);
  const proposal = await proposals.load(proposalId);
  if (run === undefined || proposal === undefined) {
    return;
  }
  const notice = { batches: proposal.batches.length, status: run.status };
  switch (run.source) {
    case "json":
      // The JSON store has no channel to the editors: server-sent events.
      for (const listener of listeners.get(run.documentId) ?? []) {
        listener({ proposalId, ...notice });
      }
      return;
    case "yjs":
      // The notice goes through the Y.Doc of the document.
      await yjs.notify(run.documentId, proposalId, notice);
      return;
    default:
      run.source satisfies never;
  }
}

proposals.subscribe((proposalId) => void notify(proposalId));

// The JSON store: the editor saves the main document here.
documentAgentRoute.put("/documents/:id", async (c) => {
  const blocks: unknown = await c.req.json();
  if (!Array.isArray(blocks)) {
    return c.json({ error: "invalid-document" }, 400);
  }
  documents.write(c.req.param("id"), blocks);
  return c.json({ ok: true });
});

documentAgentRoute.get("/documents/:id", async (c) => {
  const blocks = await documents.read(c.req.param("id"));
  return blocks === undefined
    ? c.json({ error: "unknown-document" }, 404)
    : c.json(blocks);
});

// The notices of the proposals of a document of the JSON store.
documentAgentRoute.get("/documents/:id/events", (c) => {
  const documentId = c.req.param("id");
  return streamSSE(c, async (stream) => {
    const forDocument = listeners.get(documentId) ?? new Set();
    listeners.set(documentId, forDocument);
    function listener(notice: Notice) {
      void stream.writeSSE({ event: "proposal", data: JSON.stringify(notice) });
    }
    forDocument.add(listener);
    // Keep the stream open until the client closes it.
    await new Promise<void>((resolve) => stream.onAbort(resolve));
    forDocument.delete(listener);
  });
});

// Starts a run on a document. The response does not wait for the run.
documentAgentRoute.post("/runs", async (c) => {
  const body = (await c.req.json()) as {
    documentId?: unknown;
    prompt?: unknown;
    source?: unknown;
  };
  const { documentId, prompt, source } = body;
  if (
    typeof documentId !== "string" ||
    typeof prompt !== "string" ||
    (source !== "json" && source !== "yjs")
  ) {
    return c.json({ error: "invalid-request" }, 400);
  }
  const selected = documentAgentModel();
  if (selected.error !== undefined) {
    return c.json({ error: selected.error }, 500);
  }
  function readMain() {
    return sources[source as SourceName].read(documentId as string);
  }
  const main = await readMain();
  if (main === undefined) {
    return c.json({ error: "unknown-document" }, 404);
  }

  const proposalId = crypto.randomUUID();
  const run: Run = { documentId, source, status: "running", answer: "" };
  runs.set(proposalId, run);
  await proposals.save(proposalId, createProposal(main));
  // The handle rebases the proposal onto the main document before each
  // tool call. This is the only difference from a run that a user starts.
  const handle = createDocumentHandle({
    store: proposals,
    proposalId,
    createEditor,
    readMain,
  });
  void runDocumentAgent(handle, prompt, {
    model: selected.model,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
  })
    .then(
      (result) => {
        run.status = "done";
        run.answer = result.text;
      },
      (error: unknown) => {
        run.status = "failed";
        // eslint-disable-next-line no-console
        console.error("A run of the document agent failed", error);
      },
    )
    .then(() => notify(proposalId));
  return c.json({ proposalId }, 202);
});

// The proposal of a run, for the review in an editor.
documentAgentRoute.get("/proposals/:id", async (c) => {
  const proposalId = c.req.param("id");
  const run = runs.get(proposalId);
  const proposal = await proposals.load(proposalId);
  if (run === undefined || proposal === undefined) {
    return c.json({ error: "unknown-proposal" }, 404);
  }
  return c.json({ proposal, status: run.status, answer: run.answer });
});

// A review write of a user: the accept or the reject of one tool call. The
// batch must follow the stored proposal. Else, the client loads the
// proposal again.
documentAgentRoute.post("/proposals/:id/batches", async (c) => {
  const proposalId = c.req.param("id");
  const { batch } = (await c.req.json()) as { batch?: Batch };
  const proposal = await proposals.load(proposalId);
  if (proposal === undefined) {
    return c.json({ error: "unknown-proposal" }, 404);
  }
  if (batch?.seq !== proposal.batches.length + 1) {
    return c.json({ error: "stale", batches: proposal.batches.length }, 409);
  }
  await proposals.save(proposalId, {
    origin: proposal.origin,
    batches: [...proposal.batches, batch],
  });
  return c.json({ ok: true });
});
