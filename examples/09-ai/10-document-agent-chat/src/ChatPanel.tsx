import { useChat } from "@ai-sdk/react";
import type { BlockNoteEditor } from "@blocknote/core";
import { useExtension, useExtensionState } from "@blocknote/react";
import {
  DocumentAgentExtension,
  type ReviewToolCall,
  type SessionMessageMetadata,
  type ToolCallReview,
} from "@blocknote/xl-ai";
import type { UIMessage } from "ai";
import { type FormEvent, useEffect, useRef, useState } from "react";

/**
 * A tool part of a chat message of the AI SDK, with the fields that this
 * panel shows. The input is partial while the model writes the call.
 */
type ToolPart = {
  type: `tool-${string}`;
  toolCallId: string;
  state: string;
  input?: { reason?: unknown };
  /** The output of the tool, with the decision of a user after a review. */
  output?: { error?: string; changed?: boolean; review?: ToolCallReview };
};

function isToolPart(part: { type: string }): part is ToolPart {
  return part.type.startsWith("tool-");
}

/**
 * The chat of the document agent: the requests, the answers of the agent,
 * and one card for each editing tool call, with its reason, an accept and a
 * reject.
 *
 * The messages are the chat of the editor (`agent.getChat()`): the `Chat`
 * of the AI SDK. It has the runs that this editor started, and the runs
 * that it followed. The review state of a tool call comes from the
 * proposal in the editor.
 */
export function ChatPanel(props: {
  editor: BlockNoteEditor<any, any, any>;
  /** Stops the run on the host, if the host keeps the run. */
  onStop?: () => void;
}) {
  const { editor } = props;
  const agent = useExtension(DocumentAgentExtension, { editor });
  const state = useExtensionState(DocumentAgentExtension, { editor });
  const { messages } = useChat({ chat: agent.getChat() });
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);

  const running = state.status === "running";
  const review = state.status === "idle" ? undefined : state.review;
  const open = review?.toolCalls.filter((call) => call.state === "open") ?? [];

  // Show the newest message.
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [messages, state]);

  function send(event: FormEvent) {
    event.preventDefault();
    const prompt = text.trim();
    if (prompt === "" || running) {
      return;
    }
    setText("");
    void agent.invoke(prompt);
  }

  function stop() {
    void agent.abort();
    props.onStop?.();
  }

  /** Scrolls the editor to the first block that the tool call changed. */
  function show(call: ReviewToolCall) {
    const [blockId] = call.suggestedBlockIds;
    if (blockId !== undefined) {
      editor.domElement
        ?.querySelector(`.bn-block-outer[data-id="${CSS.escape(blockId)}"]`)
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }

  return (
    <div className="agent-chat">
      <div className="agent-chat-messages">
        {messages.length === 0 && (
          <div className="agent-chat-empty">
            Ask the agent to change the document, for example "Fix the spelling
            mistakes."
          </div>
        )}
        {messages.map((message) => (
          <Message
            key={message.id}
            message={message}
            toolCalls={review?.toolCalls ?? []}
            canReview={state.status === "reviewing" || state.status === "error"}
            onAccept={(call) => agent.acceptToolCall(call.toolCallId)}
            onReject={(call) => agent.rejectToolCall(call.toolCallId)}
            onShow={show}
          />
        ))}
        {running && <div className="agent-chat-note">The agent works…</div>}
        {state.status === "error" && (
          <div className="agent-chat-error">
            {state.error === "out-of-sync"
              ? "The proposal of this editor is not the proposal of the server."
              : "The request failed."}
          </div>
        )}
        <div ref={end} />
      </div>

      {(state.status === "reviewing" || state.status === "error") && (
        <div className="agent-chat-review">
          <span>
            {open.length} change{open.length === 1 ? "" : "s"} to review
          </span>
          <button onClick={() => agent.acceptAll()}>Accept all</button>
          <button onClick={() => agent.rejectAll()}>Reject all</button>
        </div>
      )}

      <form className="agent-chat-composer" onSubmit={send}>
        <textarea
          value={text}
          rows={2}
          placeholder="Ask for a change to the document"
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              send(event);
            }
          }}
        />
        {running ? (
          <button type="button" onClick={stop}>
            Stop
          </button>
        ) : (
          <button type="submit" disabled={text.trim() === ""}>
            Send
          </button>
        )}
      </form>
    </div>
  );
}

type ToolCallActions = {
  toolCalls: ReviewToolCall[];
  canReview: boolean;
  onAccept: (call: ReviewToolCall) => void;
  onReject: (call: ReviewToolCall) => void;
  onShow: (call: ReviewToolCall) => void;
};

function Message(props: { message: UIMessage } & ToolCallActions) {
  const { message, ...actions } = props;
  if (message.role === "user") {
    const origin = (message.metadata as SessionMessageMetadata | undefined)
      ?.origin;
    return (
      <div
        className={
          origin === "external"
            ? "agent-chat-message agent-chat-outside"
            : "agent-chat-message agent-chat-user"
        }
      >
        <div className="agent-chat-label">
          {origin === "external" ? "From outside the editor" : "You"}
        </div>
        {message.parts.map((part, index) =>
          part.type === "text" ? <p key={index}>{part.text}</p> : null,
        )}
      </div>
    );
  }
  return (
    <div className="agent-chat-message agent-chat-agent">
      {message.parts.map((part, index) => {
        if (part.type === "text") {
          return part.text === "" ? null : <p key={index}>{part.text}</p>;
        }
        if (isToolPart(part)) {
          return <ToolCall key={part.toolCallId} part={part} {...actions} />;
        }
        return null;
      })}
    </div>
  );
}

/** One tool call of the agent: its reason, and the state of its change. */
function ToolCall(props: { part: ToolPart } & ToolCallActions) {
  const { part, toolCalls, canReview } = props;
  const name = part.type.slice("tool-".length);
  if (name === "readDocument") {
    return <div className="agent-chat-note">Read the document again.</div>;
  }
  // The tool call is in the proposal of the editor when its change applied.
  const call = toolCalls.find((item) => item.toolCallId === part.toolCallId);
  const reason =
    call?.reason ??
    (typeof part.input?.reason === "string" ? part.input.reason : undefined);

  return (
    <div
      className="agent-chat-call"
      data-state={call?.state ?? part.output?.review}
      onClick={call === undefined ? undefined : () => props.onShow(call)}
    >
      <div className="agent-chat-label">
        {name === "writeDocument" ? "Change to the document" : "Edit"}
      </div>
      <div>{reason ?? "…"}</div>
      <div className="agent-chat-call-state">
        {call === undefined ? (
          statusOf(part)
        ) : call.state !== "open" ? (
          call.state === "accepted" ? (
            "Accepted"
          ) : (
            "Rejected"
          )
        ) : canReview ? (
          <>
            <button
              onClick={(event) => {
                event.stopPropagation();
                props.onAccept(call);
              }}
            >
              Accept
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation();
                props.onReject(call);
              }}
            >
              Reject
            </button>
          </>
        ) : (
          "In the document, as a suggestion"
        )}
      </div>
    </div>
  );
}

/** The state of a tool call that is not in the proposal of the editor. */
function statusOf(part: ToolPart): string {
  switch (part.state) {
    case "input-streaming":
    case "input-available":
      return "The agent writes…";
    case "output-error":
      return "The tool failed.";
    case "output-available":
      if (part.output?.error !== undefined) {
        return `This change did not apply (${part.output.error}). The agent tries again.`;
      }
      if (part.output?.changed === false) {
        return "No change: the document already had this text.";
      }
      // The proposal of this change is closed: the output has the decision.
      switch (part.output?.review) {
        case "accepted":
          return "Accepted";
        case "rejected":
          return "Rejected";
        default:
          return "Closed";
      }
    default:
      return "";
  }
}

/**
 * A box that starts a run from outside the editor: it stands for a script,
 * a schedule or an external agent. The request does not go through the
 * chat of this editor: the server starts the run, and tells the editors.
 */
export function RunFromOutside(props: { runsUrl: string }) {
  const [prompt, setPrompt] = useState(
    "Add one sentence to the last paragraph.",
  );
  const [message, setMessage] = useState("");

  async function start() {
    setMessage("");
    const response = await fetch(props.runsUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    if (response.status === 409) {
      setMessage("A run is in progress. Try again after it.");
    } else if (!response.ok) {
      setMessage("The server did not start the run.");
    }
  }

  return (
    <div className="agent-chat-outside-box">
      <strong>Run from outside</strong>
      <span>
        The server starts this run, as for a script or an external agent:
      </span>
      <code>POST {new URL(props.runsUrl).pathname}</code>
      <textarea
        value={prompt}
        rows={2}
        onChange={(event) => setPrompt(event.target.value)}
      />
      <button onClick={() => void start()}>Start a run on the server</button>
      {message !== "" && <div className="agent-chat-error">{message}</div>}
    </div>
  );
}
