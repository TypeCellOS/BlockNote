import type { BlockNoteEditor } from "@blocknote/core";
import {
  useBlockNoteContext,
  useExtension,
  useExtensionState,
} from "@blocknote/react";
import { useEffect, useState } from "react";

import { suggestionIdOf } from "../proposal/derive.js";
import {
  DocumentAgentExtension,
  type ReviewToolCall,
} from "./DocumentAgentExtension.js";

/**
 * The review of a proposal: one card for each editing tool call, with the
 * reason of the agent, and an accept and a reject for that call. A card
 * shows where its suggestions are: the pointer on a card marks them in the
 * editor, and a click scrolls to them.
 *
 * Each suggestion mark has an ID that identifies its tool call (`data-id`,
 * see `suggestionIdOf`). Thus, a comment thread on these marks can show the
 * same reason later.
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
  const agent = useExtension(DocumentAgentExtension, { editor });
  const state = useExtensionState(DocumentAgentExtension, { editor });
  // The suggestion ID of the tool call under the pointer: of its card, or
  // of one of its suggestions in the editor.
  const [active, setActive] = useState<number | undefined>();

  // The pointer on a suggestion in the editor marks the card of its tool
  // call. Thus, the user sees the reason of each suggestion.
  const dom = editor.domElement;
  useEffect(() => {
    if (dom === undefined) {
      return;
    }
    function onPointer(event: MouseEvent) {
      const mark =
        event.target instanceof Element
          ? event.target.closest(SUGGESTION_SELECTOR)
          : null;
      const id = Number(mark?.getAttribute("data-id"));
      setActive(mark === null || Number.isNaN(id) ? undefined : id);
    }
    dom.addEventListener("mouseover", onPointer);
    return () => dom.removeEventListener("mouseover", onPointer);
  }, [dom]);

  if (state.status === "idle") {
    return null;
  }
  const { toolCalls, answer } = state.review;
  const canReview = state.status !== "running";

  function scrollTo(call: ReviewToolCall) {
    const blockId = call.suggestedBlockIds[0];
    if (blockId === undefined) {
      return;
    }
    editor?.domElement
      ?.querySelector(`[data-id="${CSS.escape(blockId)}"]`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  return (
    <div className="bn-agent-review" aria-live="polite">
      {active !== undefined && (
        // The marks of the tool call under the pointer.
        <style>{activeStyle(active)}</style>
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
          data-active={suggestionIdOf(call) === active ? "true" : undefined}
          onMouseEnter={() => setActive(suggestionIdOf(call))}
          onMouseLeave={() => setActive(undefined)}
          onClick={() => scrollTo(call)}
        >
          <div className="bn-agent-card-reason">{call.reason}</div>
          <div className="bn-agent-card-meta">{describe(call)}</div>
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

/** The elements of the suggestion marks in the editor. */
const SUGGESTION_SELECTOR = 'ins, del, [data-type="modification"]';

/** The CSS that marks the suggestions of one tool call in the editor. */
function activeStyle(suggestionId: number): string {
  const id = `[data-id="${suggestionId}"]`;
  return `.bn-editor ins${id}, .bn-editor del${id}, .bn-editor [data-type="modification"]${id} { outline: 2px solid var(--bn-agent-active, #4f8ff7); outline-offset: 1px; }`;
}

/** One line on the state of a tool call, and on the blocks that it changed. */
function describe(call: ReviewToolCall): string {
  if (call.state === "accepted") {
    return "Accepted";
  }
  if (call.state === "rejected") {
    return "Rejected";
  }
  const blocks = call.suggestedBlockIds.length;
  const shared = call.sharedBlockIds.length;
  if (blocks === 0) {
    return shared > 0
      ? "A later change shows the blocks of this change."
      : "No change is left to show.";
  }
  return `${blocks} block${blocks === 1 ? "" : "s"}${
    shared > 0 ? `, ${shared} with another change` : ""
  }`;
}
