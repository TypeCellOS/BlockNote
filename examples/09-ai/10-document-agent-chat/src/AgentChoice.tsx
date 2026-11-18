import { useState } from "react";

import {
  type AgentKind,
  agentLink,
  type MyAgentState,
  selectAgent,
  selectedAgent,
  useMyAgent,
} from "./myAgent";

/** The line that tells the user what their agent does now. */
function stateText(state: MyAgentState | undefined): string {
  if (state === undefined) {
    return "…";
  }
  if (state.working) {
    return "Your agent works on this document.";
  }
  return state.listening
    ? "Your agent listens. It answers your requests in this chat."
    : "Your agent does not listen. Give it this text in its own chat:";
}

/**
 * The selection between the built-in agent and the agent of the user, with
 * the text that connects the agent, and the state of the agent.
 */
export function AgentChoice(props: { sessionUrl: string }) {
  const [kind, setKind] = useState<AgentKind>(selectedAgent);
  const state = useMyAgent(props.sessionUrl, kind === "mine");
  const invitation = `Run \`curl -s ${agentLink(props.sessionUrl)}\` and follow the instructions in its output.`;

  function select(next: AgentKind) {
    selectAgent(next);
    setKind(next);
  }

  return (
    <div className="agent-chat-choice">
      <div className="agent-chat-choice-kinds">
        <label>
          <input
            type="radio"
            name="agent-kind"
            checked={kind === "built-in"}
            onChange={() => select("built-in")}
          />
          Built-in agent
        </label>
        <label>
          <input
            type="radio"
            name="agent-kind"
            checked={kind === "mine"}
            onChange={() => select("mine")}
          />
          My agent
        </label>
      </div>
      {kind === "mine" && (
        <>
          <div
            className="agent-chat-choice-state"
            data-active={state?.listening === true || state?.working === true}
          >
            {stateText(state)}
          </div>
          {state !== undefined && !state.listening && !state.working && (
            <code>{invitation}</code>
          )}
          <span>
            Your agent gets the content of this document, and it has all its own
            tools. Its changes are suggestions. You can also ask it in its own
            chat to change the document.
          </span>
        </>
      )}
    </div>
  );
}
