import type {
  AgentCallResult,
  AgentLoop,
  AttachedAgentRef,
  AttachedAgents,
  RunOrigin,
  StartedRun,
} from "@blocknote/xl-ai-lenses/server";
import type { Context, Hono } from "hono";

import { attachedAgentInstructions } from "./attachedAgentInstructions.js";

// The HTTP door for an agent that a user attached to a document: an agent
// in a chat that the user has open, for example Claude Code on the computer
// of the user (see `attached/attachedAgents.ts` of `@blocknote/xl-ai-lenses`).
// The user pastes one link into the agent. The agent then calls these
// routes with `curl`. Nothing runs on the computer of the user for this,
// and this server has no connection to the agent.
//
// The paths start with `/sessions/:source/:id/agents/:token`. That path is
// the link of the user.
//
// - `PUT /`: the editor of the user attaches the agent with the token to
//   the document. Before that, each other route answers 404.
// - `GET /`: the instructions for the agent, as text.
// - `GET /state`: tells the editor if the agent listens and if it works.
// - `GET /events`: the next request of the user from the chat of the
//   editor, as one line of JSON. The request waits. 204 if none came.
// - `POST /requests`: a request that the user wrote in the chat of the
//   agent, as text. It starts a run, and the response has the document.
// - `POST /tools/:name`: a call of a document tool, with its input as JSON.
//   The response is the text that the model of the built-in agent gets.
// - `POST /reply`: the answer of the agent, as text. It ends the run.
//
// A route has no logic of its own: each one is one call of the attached
// agents, and the response is the text of the result.
//
// The token in the path is the only check of this demo server. A product
// needs a pairing token with a short life, and a credential in a header
// that the user can revoke.

const AGENT_PATH = "/sessions/:source/:id/agents/:token";

const NOT_ATTACHED =
  'This link is not active. Ask the user to select "My agent" in the editor of the document, and to give you the link again.';

/** The key of a document for the attached agents: a document ID is unique only in its source. */
export function agentDocumentKey(source: string, documentId: string): string {
  return `${source}/${documentId}`;
}

/** The request that starts a run (see `ChatSessions.startRun`). */
type RunRequest = { prompt: string; origin: RunOrigin; loop: AgentLoop };

export function registerAttachedAgentRoutes(
  route: Hono,
  options: {
    agents: AttachedAgents;
    /** Starts a run in the session of the document. */
    startRun(
      source: string,
      documentId: string,
      request: RunRequest,
    ): Promise<{ error?: undefined; run: StartedRun } | { error: string }>;
  },
) {
  const { agents } = options;

  /** The agent of a request, from the parameters of its path. */
  function agentOf(params: {
    source: string;
    id: string;
    token: string;
  }): AttachedAgentRef {
    return {
      document: agentDocumentKey(params.source, params.id),
      token: params.token,
    };
  }

  /** The response for the result of a call of the agent: its text. */
  function respond(c: Context, result: AgentCallResult) {
    switch (result.error) {
      case undefined:
        return c.text(`${result.text}\n`);
      case "not-attached":
        return c.text(`${NOT_ATTACHED}\n`, 404);
      case "no-run":
        return c.text(`${result.text}\n`, 409);
      case "unknown-tool":
        return c.text(`${result.text}\n`, 404);
      case "invalid-input":
        return c.text(`${result.text}\n`, 400);
      default:
        return result satisfies never;
    }
  }

  route.put(AGENT_PATH, (c) => {
    agents.attach(agentOf(c.req.param()));
    return c.json({ ok: true });
  });

  route.get(AGENT_PATH, (c) => {
    if (agents.stateOf(agentOf(c.req.param())) === undefined) {
      return c.text(`${NOT_ATTACHED}\n`, 404);
    }
    const url = new URL(c.req.url);
    return c.text(attachedAgentInstructions(`${url.origin}${url.pathname}`));
  });

  route.get(`${AGENT_PATH}/state`, (c) => {
    const state = agents.stateOf(agentOf(c.req.param()));
    return state === undefined
      ? c.json({ error: "agent-not-attached" }, 404)
      : c.json(state);
  });

  route.get(`${AGENT_PATH}/events`, async (c) => {
    const next = await agents.nextEvent(
      agentOf(c.req.param()),
      c.req.raw.signal,
    );
    if (next.error !== undefined) {
      return c.text(`${NOT_ATTACHED}\n`, 404);
    }
    if (next.event === undefined) {
      return c.body(null, 204);
    }
    // The event has no document: the agent reads the document with a tool
    // call, as plain text. Text in a JSON string is hard to copy exactly.
    const { id, type, text, decisions } = next.event;
    return c.text(`${JSON.stringify({ id, type, text, decisions })}\n`);
  });

  route.post(`${AGENT_PATH}/requests`, async (c) => {
    const agent = agentOf(c.req.param());
    const state = agents.stateOf(agent);
    if (state === undefined) {
      return c.text(`${NOT_ATTACHED}\n`, 404);
    }
    const prompt = (await c.req.text()).trim();
    if (prompt === "") {
      return c.text("Invalid input: the request has no text.\n", 400);
    }
    const { loop, opening } = agents.run(agent, "agent");
    const started = await options.startRun(
      c.req.param("source"),
      c.req.param("id"),
      { prompt, origin: "external", loop },
    );
    if (started.error === "run-active") {
      return c.text(
        state.working
          ? "You have an open run on this document. Continue that work, and end it with your answer.\n"
          : "A different run is in progress on this document. Try again later.\n",
        409,
      );
    }
    if (started.error !== undefined) {
      return c.text(`The run did not start: ${started.error}.\n`, 404);
    }
    const { document, decisions } = await opening;
    return c.text(
      [
        "The request is in the chat of the editor. This is the document:",
        "",
        document,
        ...(decisions.length === 0
          ? []
          : [
              "",
              "The decisions of the user on earlier changes:",
              ...decisions.map((decision) => `- ${decision}`),
            ]),
        "",
      ].join("\n"),
    );
  });

  route.post(`${AGENT_PATH}/tools/:name`, async (c) => {
    const input = inputOf(await c.req.text());
    if (input.error !== undefined) {
      return c.text("Invalid input: the body must be JSON.\n", 400);
    }
    return respond(
      c,
      await agents.callTool(
        agentOf(c.req.param()),
        c.req.param("name"),
        input.value,
      ),
    );
  });

  route.post(`${AGENT_PATH}/reply`, async (c) =>
    respond(c, await agents.reply(agentOf(c.req.param()), await c.req.text())),
  );
}

/** The input of a tool call from the body of a request. A tool without input has an empty body. */
function inputOf(
  body: string,
): { error?: undefined; value: unknown } | { error: "invalid-json" } {
  if (body.trim() === "") {
    return { value: {} };
  }
  try {
    return { value: JSON.parse(body) };
  } catch {
    // The body is the text of an agent: text that is not JSON is an
    // expected failure.
    return { error: "invalid-json" };
  }
}
