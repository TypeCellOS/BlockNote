import { useEffect, useState } from "react";

// "Bring your own agent": the user selects between the built-in agent (the
// model of the server) and their own agent. Their own agent runs in a chat
// that the user has open, for example Claude Code on their computer. The
// user gives that agent one link. The agent then calls the server for the
// requests of the user and for the document tools (see the routes
// `/sessions/:source/:id/agents/:token` of `packages/xl-ai-server`). The
// chat, the review and the document are the same for the two agents.

/** The agent that answers the requests of this user. */
export type AgentKind = "built-in" | "mine";

/** The state of the agent of the user (see `AttachedAgentState`). */
export type MyAgentState = { listening: boolean; working: boolean };

const KIND_KEY = "document-agent-chat:agent";
const TOKEN_KEY = "document-agent-chat:agent-token";

/**
 * The token of this browser for the agent of the user: the link for the
 * agent has it, and each chat request for "my agent" has it. A production
 * app makes the token on the server, for the user of a session.
 */
function agentToken(): string {
  let token = localStorage.getItem(TOKEN_KEY);
  if (token === null) {
    token = crypto.randomUUID();
    localStorage.setItem(TOKEN_KEY, token);
  }
  return token;
}

export function selectedAgent(): AgentKind {
  return localStorage.getItem(KIND_KEY) === "mine" ? "mine" : "built-in";
}

export function selectAgent(kind: AgentKind) {
  localStorage.setItem(KIND_KEY, kind);
}

/**
 * The `agent` field of a chat request: the token of the agent, if the user
 * selected their own agent. Without it, the server uses its model.
 */
export function agentOfRequest(): { token: string } | undefined {
  return selectedAgent() === "mine" ? { token: agentToken() } : undefined;
}

/** The link that the user gives to their agent, for the document of the session. */
export function agentLink(sessionUrl: string): string {
  return `${sessionUrl}/agents/${agentToken()}`;
}

/**
 * Attaches the agent of the user to the document of the session while
 * `active` is true, and gives the state of the agent. `undefined` until the
 * server answers. The hook asks the server each two seconds.
 */
export function useMyAgent(
  sessionUrl: string,
  active: boolean,
): MyAgentState | undefined {
  const [state, setState] = useState<MyAgentState>();
  useEffect(() => {
    if (!active) {
      setState(undefined);
      return;
    }
    const link = agentLink(sessionUrl);
    let current = true;
    async function ask() {
      let response = await fetch(`${link}/state`).catch(() => undefined);
      if (response?.status === 404) {
        // The server does not know the agent: the first time, or after a
        // restart of the server. The editor of the user attaches it.
        await fetch(link, { method: "PUT" }).catch(() => undefined);
        response = await fetch(`${link}/state`).catch(() => undefined);
      }
      if (!current || response === undefined || !response.ok) {
        return;
      }
      const next = (await response.json()) as Partial<MyAgentState>;
      if (current) {
        setState({
          listening: next.listening === true,
          working: next.working === true,
        });
      }
    }
    void ask();
    const timer = setInterval(() => void ask(), 2000);
    return () => {
      current = false;
      clearInterval(timer);
    };
  }, [sessionUrl, active]);
  return state;
}
