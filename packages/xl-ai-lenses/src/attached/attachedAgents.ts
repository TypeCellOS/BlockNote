import { generateId, type UIMessage, type UIMessageChunk } from "ai";

import type { AgentRunOptions } from "../agent/documentAgent.js";
import type { AgentDocument } from "../tools/agentDocument.js";
import {
  describeDecision,
  describeOpening,
  describeRead,
  describeWrite,
} from "../tools/describe.js";
import { readDocument, type ToolCallReview } from "../tools/documentTools.js";
import {
  createToolCalls,
  type DocumentToolName,
  isDocumentToolName,
  type ToolCalls,
} from "../tools/toolCalls.js";
import { DOCUMENT_TOOL_DEFINITIONS } from "../tools/toolDefinitions.js";
import { createRunStream } from "./runStream.js";

// The agents that users attached to documents of a host.
//
// An attached agent is an agent of a user that runs in a chat that the user
// has open, for example Claude Code on the computer of the user. It is not
// started by the host, and the host has no connection to it. The agent
// calls the host: it asks for the next event, it calls the document tools,
// and it sends its answer. A door of the host gives it these calls, for
// example HTTP routes (see `packages/xl-ai-server`). This file has no
// transport.
//
// The work of the agent is a run of the chat of the document, as the work
// of the built-in agent is: the editors, the review, the chat store and a
// later run of the built-in loop read it without a change. The difference
// is who writes the run. The built-in loop writes its own run. Here, the
// calls of the agent write it (see `AgentLoop`).

/** An agent that a user attached to a document. */
export type AttachedAgentRef = {
  /** The key of the document for the host. */
  document: string;
  /** The token of the user for their agent. Each user has their own. */
  token: string;
};

/** What the agent gets at the start of a run. */
export type RunOpening = {
  /** The current document, as the text that `readDocument` gives. */
  document: string;
  /**
   * The decisions of the users on earlier changes, which the agent does
   * not know: the agent has the result of a tool call, and not the later
   * accept or reject.
   */
  decisions: string[];
};

/** A request of a user in the chat of an editor, for the agent. */
export type AgentEvent = RunOpening & {
  id: number;
  type: "request";
  /** The text of the request. */
  text: string;
};

/** The state of an attached agent, for the editor of its user. */
export type AttachedAgentState = {
  /** True if the agent asks for events: a request of the editor gets to it. */
  listening: boolean;
  /** True if a run of the agent is open on the document. */
  working: boolean;
};

/**
 * The result of a call of the agent. An expected failure is a value with a
 * text for the agent: the agent is a program of a user, and its calls can
 * have each content.
 */
export type AgentCallResult =
  | { error?: undefined; text: string }
  | { error: "not-attached" }
  | { error: "no-run" | "unknown-tool" | "invalid-input"; text: string };

export type AttachedAgentsOptions = {
  /** How long a request for the next event waits. The default is 50 seconds. */
  waitMs?: number;
  /**
   * How long a run stays open without a call of the agent. After that
   * time, the run ends with a note in the chat. The default is 10 minutes.
   */
  idleMs?: number;
  /**
   * How long after its last call an agent counts as listening, without an
   * open request for events. The default is 20 seconds.
   */
  graceMs?: number;
};

export type AttachedAgents = {
  /** Gives the agent with this token the access to the document. */
  attach(agent: AttachedAgentRef): void;
  /** The state of the agent, or `undefined` if no user attached it. */
  stateOf(agent: AttachedAgentRef): AttachedAgentState | undefined;
  /**
   * Makes the loop of one run of the agent, for `startRun` of the session
   * of the document. The run stays open until the agent sends its answer,
   * a user stops it, or the time limit passes.
   *
   * - `"editor"`: a user wrote the request in the chat of an editor. The
   *   agent gets it as the next event.
   * - `"agent"`: the user wrote the request in the chat of the agent, and
   *   the agent started the run. `opening` gives it the document.
   *
   * `opening` resolves when the run is open, and rejects if it failed to
   * open. It stays pending if the session did not start the run.
   */
  run(
    agent: AttachedAgentRef,
    from: "editor" | "agent",
  ): { loop: AttachedAgentLoop; opening: Promise<RunOpening> };
  /**
   * The next event for the agent. The call waits if there is none, and
   * gives `event: undefined` after the wait time or when `signal` aborts.
   * An event goes to the agent one time.
   */
  nextEvent(
    agent: AttachedAgentRef,
    signal: AbortSignal,
  ): Promise<
    | { error?: undefined; event: AgentEvent | undefined }
    | { error: "not-attached" }
  >;
  /** Runs one call of a document tool in the open run of the agent. */
  callTool(
    agent: AttachedAgentRef,
    name: string,
    input: unknown,
  ): Promise<AgentCallResult>;
  /** Puts the answer of the agent into the chat, and ends its run. */
  reply(agent: AttachedAgentRef, text: string): Promise<AgentCallResult>;
};

/** The loop of one run of an attached agent (see `AgentLoop`). */
export type AttachedAgentLoop = <Extra extends object>(
  document: AgentDocument<Extra>,
  messages: UIMessage[],
  options: AgentRunOptions<Extra>,
) => Promise<ReadableStream<UIMessageChunk>>;

/** The text for the agent when it has no open run on the document. */
const NO_RUN =
  "No run is open for you on this document. If the user asked you in your own chat to work on the document, send the request first. If you worked on a request from the editor, the user stopped it or its time limit passed: do not continue that work.";

/** The note in the chat for a run that the agent did not end. The agent did not write this text. */
const NOT_ENDED = "The agent did not end its work in time.";

type Attached = {
  /** The events that the agent did not get. */
  events: AgentEvent[];
  lastEventId: number;
  /** The requests for the next event that wait. Each one ends its wait. */
  waiters: Set<() => void>;
  /** The time of the last call of the agent. */
  lastSeen: number;
  /** The tool calls whose decision the agent knows. */
  told: Set<string>;
};

/** The open run of a document, for the calls of its agent. */
type OpenRun = {
  token: string;
  /** The text of the result for the agent, or `undefined` if the run ended before the call. */
  tool(
    name: DocumentToolName,
    input: Record<string, unknown>,
  ): Promise<string | undefined>;
  /** False if the run ended before the answer. */
  reply(text: string): Promise<boolean>;
};

/**
 * Makes the attached agents of a host. The state is in the memory of this
 * process: the events that wait, and the open runs. Thus, the calls of an
 * agent must get to the process that has its run. The chat and the stream
 * of a run are in the stores of the sessions, as for each run.
 */
export function createAttachedAgents(
  options: AttachedAgentsOptions = {},
): AttachedAgents {
  const waitMs = options.waitMs ?? 50_000;
  const idleMs = options.idleMs ?? 600_000;
  const graceMs = options.graceMs ?? 20_000;

  const attached = new Map<string, Attached>();
  /** The open run of each document. A document has one run at a time. */
  const runs = new Map<string, OpenRun>();

  function stateOf(agent: AttachedAgentRef): Attached | undefined {
    return attached.get(`${agent.document}\n${agent.token}`);
  }

  /** The state of the agent for one of its calls. The call shows that the agent is there. */
  function seen(agent: AttachedAgentRef): Attached | undefined {
    const state = stateOf(agent);
    if (state !== undefined) {
      state.lastSeen = Date.now();
    }
    return state;
  }

  function runOf(agent: AttachedAgentRef): OpenRun | undefined {
    const run = runs.get(agent.document);
    return run?.token === agent.token ? run : undefined;
  }

  function run(agent: AttachedAgentRef, from: "editor" | "agent") {
    const found = stateOf(agent);
    if (found === undefined) {
      throw new Error("The agent is not attached to the document");
    }
    const state: Attached = found;
    let resolveOpening: (opening: RunOpening) => void;
    let rejectOpening: (error: unknown) => void;
    const opening = new Promise<RunOpening>((resolve, reject) => {
      resolveOpening = resolve;
      rejectOpening = reject;
    });
    // A run from the editor has no reader of `opening`.
    opening.catch(() => undefined);

    async function loop<Extra extends object>(
      document: AgentDocument<Extra>,
      messages: UIMessage[],
      runOptions: AgentRunOptions<Extra>,
    ): Promise<ReadableStream<UIMessageChunk>> {
      const out = createRunStream(() => stop());
      /** Sends the extra data of a step to the clients that follow the run. */
      function onExtra(extra: Extra, toolCallId?: string) {
        const chunk = runOptions.extraChunk?.(extra, toolCallId);
        if (chunk !== undefined) {
          out.add(chunk);
        }
      }
      const calls = createToolCalls(document, onExtra);
      /** The end of the work on the last call: the calls run in order. */
      let queue: Promise<unknown> = Promise.resolve();
      let idle: ReturnType<typeof setTimeout> | undefined;

      /** Starts the time limit of the run again: the agent made a call. */
      function alive() {
        clearTimeout(idle);
        idle = setTimeout(() => {
          out.text(NOT_ENDED);
          finish();
        }, idleMs);
      }

      /** The event of the request of this run, if the agent did not get it. */
      let event: AgentEvent | undefined;

      /**
       * Closes the run for the agent: it gets "no run" for a later call.
       * A request that the agent did not get goes away with its run: an
       * agent that comes back later must not start work on it.
       */
      function close() {
        clearTimeout(idle);
        if (runs.get(agent.document) === openRun) {
          runs.delete(agent.document);
        }
        state.events = state.events.filter((item) => item !== event);
        runOptions.abortSignal?.removeEventListener("abort", stop);
      }

      function finish() {
        close();
        out.end({ type: "finish" });
      }

      /** The user stopped the run. The changes that the agent wrote stay. */
      function stop() {
        close();
        out.end({ type: "abort" });
      }

      /** A bug or an outage: the stream of the run fails. */
      function fail(error: unknown) {
        close();
        out.fail(error);
      }

      const openRun: OpenRun = {
        token: agent.token,
        tool(name, input) {
          const result = queue.then(async () => {
            if (!out.isOpen()) {
              return undefined;
            }
            alive();
            const toolCallId = `call_${generateId()}`;
            out.toolInput(toolCallId, name, input);
            try {
              // A tool gives its expected failures as values. A tool that
              // throws is a bug: the run fails.
              const { output, text } = await runTool(
                calls,
                name,
                input,
                toolCallId,
              );
              out.toolOutput(toolCallId, output);
              return text;
            } catch (error) {
              fail(error);
              throw error;
            }
          });
          queue = result.catch(() => undefined);
          return result;
        },
        reply(text) {
          const result = queue.then(() => {
            if (!out.isOpen()) {
              return false;
            }
            out.text(text);
            finish();
            return true;
          });
          queue = result;
          return result;
        },
      };

      async function start() {
        out.add({
          type: "start",
          ...(runOptions.messageId === true ? { messageId: generateId() } : {}),
        });
        // The document for the request, as the built-in loop reads it for
        // its first LLM call. In proposal mode, this read rebases the
        // proposal.
        const read = await readDocument(document);
        onExtra(read);
        out.add({ type: "start-step" });
        if (runOptions.abortSignal?.aborted) {
          stop();
          return;
        }
        runOptions.abortSignal?.addEventListener("abort", stop);
        const opened: RunOpening = {
          document: describeOpening(read),
          decisions: newDecisionsOf(state, messages),
        };
        runs.set(agent.document, openRun);
        alive();
        if (from === "editor") {
          state.lastEventId += 1;
          event = {
            id: state.lastEventId,
            type: "request",
            text: requestOf(messages),
            ...opened,
          };
          state.events.push(event);
          // One waiter gets the event. The others wait for the next one.
          const [first] = state.waiters;
          first?.();
        }
        resolveOpening(opened);
      }

      void start().catch((error: unknown) => {
        rejectOpening(error);
        fail(error);
      });
      return out.stream;
    }

    return { loop, opening };
  }

  return {
    attach(agent) {
      const key = `${agent.document}\n${agent.token}`;
      if (!attached.has(key)) {
        attached.set(key, {
          events: [],
          lastEventId: 0,
          waiters: new Set(),
          lastSeen: 0,
          told: new Set(),
        });
      }
    },

    stateOf(agent) {
      const state = stateOf(agent);
      return state === undefined
        ? undefined
        : {
            listening:
              state.waiters.size > 0 || Date.now() - state.lastSeen < graceMs,
            working: runOf(agent) !== undefined,
          };
    },

    run,

    async nextEvent(agent, signal) {
      const found = seen(agent);
      if (found === undefined) {
        return { error: "not-attached" };
      }
      const state: Attached = found;
      if (state.events.length === 0 && !signal.aborted) {
        await new Promise<void>((resolve) => {
          function done() {
            clearTimeout(timer);
            state.waiters.delete(done);
            signal.removeEventListener("abort", done);
            resolve();
          }
          const timer = setTimeout(done, waitMs);
          state.waiters.add(done);
          signal.addEventListener("abort", done);
        });
        state.lastSeen = Date.now();
      }
      // An agent that went away gets no event: the event stays for its
      // next request.
      return { event: signal.aborted ? undefined : state.events.shift() };
    },

    async callTool(agent, name, input) {
      if (seen(agent) === undefined) {
        return { error: "not-attached" };
      }
      if (!isDocumentToolName(name)) {
        return {
          error: "unknown-tool",
          text: `Unknown tool: ${name}. The tools are: ${Object.keys(DOCUMENT_TOOL_DEFINITIONS).join(", ")}.`,
        };
      }
      if (!isObject(input)) {
        return {
          error: "invalid-input",
          text: "Invalid input: the input of a tool call must be a JSON object.",
        };
      }
      const text = await runOf(agent)?.tool(name, input);
      return text === undefined ? { error: "no-run", text: NO_RUN } : { text };
    },

    async reply(agent, text) {
      if (seen(agent) === undefined) {
        return { error: "not-attached" };
      }
      if (text.trim() === "") {
        return {
          error: "invalid-input",
          text: "Invalid input: the answer has no text.",
        };
      }
      const sent = await runOf(agent)?.reply(text);
      return sent === true
        ? { text: "OK. The chat of the editor has your answer." }
        : { error: "no-run", text: NO_RUN };
    },
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Runs one call of a document tool, and returns its output for the
 * clients, and the text for the agent: the text that the model of the
 * built-in loop gets.
 */
async function runTool<Extra extends object>(
  calls: ToolCalls<Extra>,
  name: DocumentToolName,
  input: Record<string, unknown>,
  toolCallId: string,
): Promise<{ output: object; text: string }> {
  // The tools examine the fields of their input (`invalid-input`). Thus,
  // an object of an agent is a permitted input.
  if (name === "readDocument") {
    const output = await calls.run(name, input as never, toolCallId);
    return { output, text: describeRead(output) };
  }
  const output = await calls.run(name, input as never, toolCallId);
  return { output, text: describeWrite(output) };
}

/** The text of the last message of a user: the request of the run. */
function requestOf(messages: readonly UIMessage[]): string {
  const message = messages.findLast((item) => item.role === "user");
  if (message === undefined) {
    throw new Error("The run has no message of a user");
  }
  return message.parts
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join("\n");
}

/**
 * The decisions of the users on the changes of the tool calls of the chat,
 * which the agent does not know, as texts for the agent. The built-in loop
 * gets the chat with each run: its model reads a decision in the result of
 * the tool call. An attached agent has only the results that it got from
 * its calls.
 */
function newDecisionsOf(
  state: Attached,
  messages: readonly UIMessage[],
): string[] {
  return messages.flatMap((message) =>
    message.parts.flatMap((part): string[] => {
      if (!part.type.startsWith("tool-") || !("toolCallId" in part)) {
        return [];
      }
      const { review } = (part.output ?? {}) as { review?: ToolCallReview };
      if (review === undefined || state.told.has(part.toolCallId)) {
        return [];
      }
      state.told.add(part.toolCallId);
      const { reason } = (part.input ?? {}) as { reason?: unknown };
      return [
        describeDecision(
          typeof reason === "string" ? reason : undefined,
          review,
        ),
      ];
    }),
  );
}
