import type { BlockNoteEditor } from "@blocknote/core";
import { useBlockNoteContext } from "@blocknote/react";
import { useEffect, useState, useSyncExternalStore } from "react";

import {
  type DocumentAgent,
  documentAgentOf,
  type ReviewedToolCall,
} from "./agentExtension.js";

/**
 * The review of the changes of the agent: one card for each editing tool
 * call, with the reason of the agent, and an accept and a reject for that
 * call. A card shows where its changes are: the pointer on a card marks
 * them in the editor, and a click scrolls to them.
 *
 * The component is the same for each mode of the document agent. The mode
 * of the editor tells which elements of the editor show the changes of a
 * tool call (`suggestionSelector`, `toolCallOfElement`).
 */
export function DocumentAgentReview(props: {
  /** The editor. The default is the editor of the BlockNote context. */
  editor?: BlockNoteEditor<any, any, any>;
}) {
  const context = useBlockNoteContext();
  const editor = props.editor ?? context?.editor;
  if (editor === undefined) {
    throw new Error("DocumentAgentReview needs an editor");
  }
  const agent = documentAgentOf(editor);
  if (agent === undefined) {
    throw new Error("DocumentAgentReview needs a document agent extension");
  }
  const state = useSyncExternalStore(agent.subscribe, agent.getState);
  // The tool call under the pointer: of its card, or of one of its changes
  // in the editor.
  const [active, setActive] = useState<string | undefined>();

  // The pointer on a change in the editor marks the card of its tool call.
  // Thus, the user sees the reason of each change.
  const dom = editor.domElement;
  useEffect(() => {
    if (dom === undefined) {
      return;
    }
    function onPointer(event: MouseEvent) {
      setActive(
        event.target instanceof Element
          ? agent?.toolCallOfElement(event.target)
          : undefined,
      );
    }
    dom.addEventListener("mouseover", onPointer);
    return () => dom.removeEventListener("mouseover", onPointer);
  }, [agent, dom]);

  if (state.status === "idle") {
    return null;
  }
  const { toolCalls, answer } = state.review;
  const canReview = state.status !== "running";

  function scrollTo(call: ReviewedToolCall) {
    editor?.domElement
      ?.querySelector(agent?.suggestionSelector(call.toolCallId) ?? "")
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  return (
    <div className="bn-agent-review" aria-live="polite">
      {active !== undefined && (
        // The changes of the tool call under the pointer.
        <style>{activeStyle(agent.suggestionSelector(active))}</style>
      )}
      <div className="bn-agent-review-status">
        {state.status === "running" && "The AI works on the document…"}
        {state.status === "reviewing" &&
          `${toolCalls.length} change${toolCalls.length === 1 ? "" : "s"} to review`}
        {state.status === "error" &&
          (state.error === "out-of-sync"
            ? "The changes of the AI do not fit this document. Reject them and try again."
            : "The AI request failed. You can keep or reject the changes that arrived.")}
      </div>
      {toolCalls.map((call) => (
        <div
          key={call.toolCallId}
          className="bn-agent-card"
          data-state={call.state}
          data-active={call.toolCallId === active ? "true" : undefined}
          onMouseEnter={() => setActive(call.toolCallId)}
          onMouseLeave={() => setActive(undefined)}
          onClick={() => scrollTo(call)}
        >
          <div className="bn-agent-card-reason">{call.reason}</div>
          <div className="bn-agent-card-meta">{describe(agent, call)}</div>
          {call.state === "open" && (
            <div className="bn-agent-card-actions">
              <button
                disabled={!canReview}
                onClick={(event) => {
                  event.stopPropagation();
                  agent.acceptToolCall(call.toolCallId);
                }}
              >
                Accept
              </button>
              <button
                disabled={!canReview}
                onClick={(event) => {
                  event.stopPropagation();
                  agent.rejectToolCall(call.toolCallId);
                }}
              >
                Reject
              </button>
            </div>
          )}
        </div>
      ))}
      {answer !== "" && <div className="bn-agent-answer">{answer}</div>}
    </div>
  );
}

/** The CSS that marks the elements of a selector in the editor. */
function activeStyle(selector: string): string {
  return `.bn-editor :is(${selector}) { outline: 2px solid var(--bn-agent-active, #4f8ff7); outline-offset: 1px; }`;
}

/** One line on the state of a tool call, and on what the editor shows of it. */
function describe(agent: DocumentAgent, call: ReviewedToolCall): string {
  if (call.state === "accepted") {
    return "Accepted";
  }
  if (call.state === "rejected") {
    return "Rejected";
  }
  return agent.describeToolCall(call.toolCallId) ?? "";
}
