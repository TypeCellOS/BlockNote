import {
  type Batch,
  type CreateEditor,
  createSessionHost,
  type DocumentSource,
  type ProposalStore,
  type SessionHost,
} from "@blocknote/xl-ai/server";
import { createUIMessageStreamResponse } from "ai";
import type { Hono } from "hono";

import { documentAgentModel } from "./models.js";

/** A full write of a document needs sufficient output tokens. */
const MAX_OUTPUT_TOKENS = 16000;

// The routes of the sessions: the server keeps the chat and the one open
// proposal of each document (`createSessionHost` of `@blocknote/xl-ai`).
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
// - `POST /batches`, `POST /close`: the review of a user.
// - `POST /stop`: stops the run in progress.

export function registerSessionRoutes<Source extends string>(
  route: Hono,
  options: {
    sources: Record<Source, DocumentSource>;
    proposals: ProposalStore;
    createEditor: CreateEditor;
    /** Tells the editors of the document that its session changed. */
    notify(source: Source, documentId: string): void;
  },
) {
  const hosts = new Map<Source, SessionHost>();

  /** The session host of the document source of a request, or the error response. */
  function hostOf(
    source: string,
  ):
    | { error?: undefined; host: SessionHost }
    | { error: "unknown-source" | "unknown-provider" | "no-api-key" } {
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
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        createEditor: options.createEditor,
        proposals: options.proposals,
        readMain: (documentId) => options.sources[name].read(documentId),
        onChange: (documentId) => options.notify(name, documentId),
        onRunError(documentId, error) {
          // eslint-disable-next-line no-console
          console.error(`A run on the document ${documentId} failed`, error);
        },
      });
      hosts.set(name, host);
    }
    return { host };
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
    return createUIMessageStreamResponse({ stream: started.run.follow() });
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
  route.get("/sessions/:source/:id/stream", (c) => {
    const selected = hostOf(c.req.param("source"));
    if (selected.error !== undefined) {
      return c.json(selected, statusOf(selected.error));
    }
    const run = selected.host.activeRun(c.req.param("id"));
    return run === undefined
      ? c.body(null, 204)
      : createUIMessageStreamResponse({ stream: run.follow() });
  });

  // The accept or the reject of one tool call.
  route.post("/sessions/:source/:id/batches", async (c) => {
    const selected = hostOf(c.req.param("source"));
    if (selected.error !== undefined) {
      return c.json(selected, statusOf(selected.error));
    }
    const { batch } = (await c.req.json()) as { batch?: Batch };
    if (typeof batch?.seq !== "number") {
      return c.json({ error: "invalid-request" }, 400);
    }
    const result = await selected.host.review(c.req.param("id"), batch);
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
    const { result } = (await c.req.json()) as { result?: unknown };
    if (result !== "accepted" && result !== "rejected") {
      return c.json({ error: "invalid-request" }, 400);
    }
    await selected.host.closeProposal(c.req.param("id"), result);
    return c.json({ ok: true });
  });

  route.post("/sessions/:source/:id/stop", (c) => {
    const selected = hostOf(c.req.param("source"));
    if (selected.error !== undefined) {
      return c.json(selected, statusOf(selected.error));
    }
    selected.host.stopRun(c.req.param("id"));
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
