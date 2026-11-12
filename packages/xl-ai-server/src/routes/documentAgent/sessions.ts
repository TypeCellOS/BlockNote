import {
  type Batch,
  type ChatStore,
  type CreateEditor,
  createSessionHost,
  type DocumentSource,
  type ProposalStore,
  type RunStore,
  type SessionHost,
} from "@blocknote/xl-ai-lenses/server";
import {
  createSuggestionSessionHost,
  type SuggestionSessionHost,
  type SuggestionSessionHostOptions,
} from "@blocknote/xl-ai-lenses/yjs14-server";
import { createUIMessageStreamResponse } from "ai";
import type { Hono } from "hono";

import { documentAgentModel, documentAgentReasoning } from "./models.js";

/** A full write of a document needs sufficient output tokens. */
const MAX_OUTPUT_TOKENS = 16000;

// The routes of the sessions: the server keeps the chat and the one open
// proposal of each document (`createSessionHost` of `@blocknote/xl-ai-lenses`).
// The paths start with `/sessions/:source/:id`: the document source and the
// document ID.
//
// - `GET /`: the chat, the proposal and the run in progress, for an editor
//   that opens the document.
// - `POST /messages`: a message of a user in the chat of an editor. It
//   starts a run, and the response is the stream of that run.
// - `POST /runs`: a prompt of a caller outside the editors (a script, a
//   schedule, later an external agent). It starts a run in the same way.
//   The response does not wait for the run: the editors get a notice, and
//   follow the run.
// - `GET /stream`: the stream of the run in progress, from its start. An
//   editor that did not start the run follows it here. 204 without a run.
// - `POST /batches`, `POST /close`: the review of a user. The two are also
//   the claim of an editor with an accept guard: the server gives an
//   accept to the first request for a state of the proposal (409 for the
//   others).
// - `POST /stop`: stops the run in progress.
//
// The hosts keep the state of a session in stores (`stores`, and
// `proposals`). With stores on files, a second server process on the same
// files has the same sessions: an editor follows a run through each
// process, and each process can stop it.
//
// A source of the Yjs 14 mode (`suggestionSources`) has the same routes
// for the chat and the runs: this is the shared code of the two modes. It
// has no routes for the review (404): a decision of a user is a change of
// the Y.Docs, without the server.

export function registerSessionRoutes<Source extends string>(
  route: Hono,
  options: {
    sources: Record<Source, DocumentSource>;
    /**
     * The sources of the Yjs 14 mode: for each one, the function that gives
     * the suggestion document of a document.
     */
    suggestionSources?: Record<
      string,
      SuggestionSessionHostOptions["openSuggestion"]
    >;
    proposals: ProposalStore;
    /**
     * The stores of the chats (one for each source) and of the streams of
     * the runs. Without them, they are in the memory of the process.
     */
    stores?: { chats(source: string): ChatStore; runs: RunStore };
    createEditor: CreateEditor;
    /** Tells the editors of the document that its session changed. */
    notify(source: string, documentId: string): void;
  },
) {
  const hosts = new Map<Source, SessionHost>();
  const suggestionHosts = new Map<string, SuggestionSessionHost>();

  /** The host of a source of the Yjs 14 mode, or the error response. */
  function suggestionHostOf(
    source: string,
    openSuggestion: SuggestionSessionHostOptions["openSuggestion"],
  ):
    | { error?: undefined; host: SuggestionSessionHost; review?: undefined }
    | { error: "unknown-provider" | "no-api-key" } {
    let host = suggestionHosts.get(source);
    if (host === undefined) {
      const selected = documentAgentModel();
      if (selected.error !== undefined) {
        return { error: selected.error };
      }
      host = createSuggestionSessionHost({
        model: selected.model,
        reasoning: documentAgentReasoning(),
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        openSuggestion,
        chats: options.stores?.chats(source),
        runs: options.stores?.runs,
        onChange: (documentId) => options.notify(source, documentId),
        onRunError(documentId, error) {
          // eslint-disable-next-line no-console
          console.error(`A run on the document ${documentId} failed`, error);
        },
      });
      suggestionHosts.set(source, host);
    }
    return { host };
  }

  /**
   * The session host of the document source of a request, or the error
   * response. `review` is the host of a source in proposal mode: only that
   * mode has the review on the server.
   */
  function hostOf(
    source: string,
  ):
    | { error?: undefined; host: SessionHost; review: SessionHost }
    | { error?: undefined; host: SuggestionSessionHost; review?: undefined }
    | { error: "unknown-source" | "unknown-provider" | "no-api-key" } {
    const openSuggestion = options.suggestionSources?.[source];
    if (openSuggestion !== undefined) {
      return suggestionHostOf(source, openSuggestion);
    }
    if (!(source in options.sources)) {
      return { error: "unknown-source" };
    }
    const name = source as Source;
    let host = hosts.get(name);
    if (host === undefined) {
      const selected = documentAgentModel();
      if (selected.error !== undefined) {
        return { error: selected.error };
      }
      host = createSessionHost({
        model: selected.model,
        reasoning: documentAgentReasoning(),
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        createEditor: options.createEditor,
        proposals: options.proposals,
        chats: options.stores?.chats(name),
        runs: options.stores?.runs,
        readMain: (documentId) => options.sources[name].read(documentId),
        onChange: (documentId) => options.notify(name, documentId),
        onRunError(documentId, error) {
          // eslint-disable-next-line no-console
          console.error(`A run on the document ${documentId} failed`, error);
        },
      });
      hosts.set(name, host);
    }
    return { host, review: host };
  }

  /** The status of the HTTP response for an error value. */
  function statusOf(error: string) {
    switch (error) {
      case "unknown-source":
      case "unknown-document":
      case "no-proposal":
        return 404;
      case "run-active":
      case "stale":
        return 409;
      case "invalid-request":
        return 400;
      default:
        return 500;
    }
  }

  route.get("/sessions/:source/:id", async (c) => {
    const selected = hostOf(c.req.param("source"));
    if (selected.error !== undefined) {
      return c.json(selected, statusOf(selected.error));
    }
    return c.json(await selected.host.snapshot(c.req.param("id")));
  });

  // A message of a user: the response is the stream of the run.
  route.post("/sessions/:source/:id/messages", async (c) => {
    const selected = hostOf(c.req.param("source"));
    if (selected.error !== undefined) {
      return c.json(selected, statusOf(selected.error));
    }
    const { message } = (await c.req.json()) as {
      message?: { id?: unknown; parts?: unknown };
    };
    const prompt = textOf(message?.parts);
    if (prompt === undefined) {
      return c.json({ error: "invalid-request" }, 400);
    }
    const started = await selected.host.startRun(c.req.param("id"), {
      prompt,
      origin: "user",
      messageId: typeof message?.id === "string" ? message.id : undefined,
    });
    if (started.error !== undefined) {
      return c.json(started, statusOf(started.error));
    }
    return createUIMessageStreamResponse({
      stream: await started.run.follow(),
    });
  });

  // A prompt from outside the editors. The response does not wait.
  route.post("/sessions/:source/:id/runs", async (c) => {
    const selected = hostOf(c.req.param("source"));
    if (selected.error !== undefined) {
      return c.json(selected, statusOf(selected.error));
    }
    const { prompt } = (await c.req.json()) as { prompt?: unknown };
    if (typeof prompt !== "string" || prompt === "") {
      return c.json({ error: "invalid-request" }, 400);
    }
    const started = await selected.host.startRun(c.req.param("id"), {
      prompt,
      origin: "external",
    });
    if (started.error !== undefined) {
      return c.json(started, statusOf(started.error));
    }
    return c.json({ runId: started.run.id }, 202);
  });

  // The run in progress, from its start.
  route.get("/sessions/:source/:id/stream", async (c) => {
    const selected = hostOf(c.req.param("source"));
    if (selected.error !== undefined) {
      return c.json(selected, statusOf(selected.error));
    }
    const run = await selected.host.activeRun(c.req.param("id"));
    return run === undefined
      ? c.body(null, 204)
      : createUIMessageStreamResponse({ stream: await run.follow() });
  });

  // The accept or the reject of one tool call.
  route.post("/sessions/:source/:id/batches", async (c) => {
    const selected = hostOf(c.req.param("source"));
    if (selected.error !== undefined) {
      return c.json(selected, statusOf(selected.error));
    }
    if (selected.review === undefined) {
      return c.json({ error: "unknown-source" }, 404);
    }
    const { batch } = (await c.req.json()) as { batch?: Batch };
    if (typeof batch?.seq !== "number") {
      return c.json({ error: "invalid-request" }, 400);
    }
    const result = await selected.review.review(c.req.param("id"), batch);
    return result.error === undefined
      ? c.json({ ok: true })
      : c.json(result, statusOf(result.error));
  });

  // The user accepted or rejected the tool calls without a decision: the
  // proposal closes.
  route.post("/sessions/:source/:id/close", async (c) => {
    const selected = hostOf(c.req.param("source"));
    if (selected.error !== undefined) {
      return c.json(selected, statusOf(selected.error));
    }
    if (selected.review === undefined) {
      return c.json({ error: "unknown-source" }, 404);
    }
    const { result, batches } = (await c.req.json()) as {
      result?: unknown;
      batches?: unknown;
    };
    if (result !== "accepted" && result !== "rejected") {
      return c.json({ error: "invalid-request" }, 400);
    }
    // With `batches`, the close is a claim of an editor with an accept
    // guard: it applies only to that state of the proposal (409 if not).
    const closed = await selected.review.closeProposal(
      c.req.param("id"),
      result,
      typeof batches === "number" ? batches : undefined,
    );
    return closed.error === undefined
      ? c.json({ ok: true })
      : c.json(closed, statusOf(closed.error));
  });

  route.post("/sessions/:source/:id/stop", async (c) => {
    const selected = hostOf(c.req.param("source"));
    if (selected.error !== undefined) {
      return c.json(selected, statusOf(selected.error));
    }
    await selected.host.stopRun(c.req.param("id"));
    return c.json({ ok: true });
  });
}

/** The text of the parts of a chat message, or `undefined` if it has no text. */
function textOf(parts: unknown): string | undefined {
  if (!Array.isArray(parts)) {
    return undefined;
  }
  const text = parts
    .flatMap((part: { type?: unknown; text?: unknown }) =>
      part.type === "text" && typeof part.text === "string" ? [part.text] : [],
    )
    .join("\n");
  return text === "" ? undefined : text;
}
