import {
  createAgentUIStream,
  isStepCount,
  type LanguageModel,
  type LanguageModelUsage,
  ToolLoopAgent,
  type UIMessage,
  type UIMessageChunk,
} from "ai";

import type { CreateEditor } from "../proposal/proposal.js";
import type { Proposal } from "../proposal/types.js";
import { createInMemoryProposalStore } from "../stores/proposalStore.js";
import { createDocumentTools } from "../tools/aiSdkTools.js";
import { createDocumentHandle, type DocumentHandle } from "../tools/handle.js";
import { DOCUMENT_AGENT_INSTRUCTIONS } from "./instructions.js";

/** The options of the loop that all hosts share. */
export type DocumentAgentOptions = {
  model: LanguageModel;
  /** The instructions of the agent. The default explains the tools and the loop. */
  instructions?: string;
  /** The maximum number of LLM steps of one run. The default is 12. */
  maxSteps?: number;
};

/**
 * The agent: a multi-step tool loop of the AI SDK (`ToolLoopAgent`) with
 * the document tools of one handle. Each tool result goes back to the
 * model. The loop stops when the model answers without a tool call, or at
 * the step limit.
 *
 * All hosts use this function. A host only decides where the loop runs and
 * what the handle reads and writes.
 */
export function createDocumentAgent(
  handle: DocumentHandle,
  options: DocumentAgentOptions,
) {
  return new ToolLoopAgent({
    model: options.model,
    instructions: options.instructions ?? DOCUMENT_AGENT_INSTRUCTIONS,
    tools: createDocumentTools(handle),
    stopWhen: [isStepCount(options.maxSteps ?? 12), toolThrew],
  });
}

/**
 * Stops the loop after a step in which a tool threw. The tools give their
 * expected failures as values. Thus, an exception is a bug, and the model
 * must not continue on a document in an unknown state. The loop of the AI
 * SDK does not throw for it: the step has a `tool-error` part.
 */
function toolThrew({ steps }: { steps: { content: { type: string }[] }[] }) {
  return toolErrorsOf(steps.slice(-1)).length > 0;
}

/** The parts of the steps that tell that a tool threw. */
function toolErrorsOf<Part extends { type: string }>(
  steps: readonly { content: readonly Part[] }[],
): Part[] {
  return steps.flatMap((step) =>
    step.content.filter((part) => part.type === "tool-error"),
  );
}

/**
 * The request of a run that a user starts: the chat messages, and the copy
 * of the proposal that the client has. The host has no state of its own.
 */
export type DocumentAgentRequest = {
  messages: UIMessage[];
  proposal: Proposal;
};

/**
 * Runs the agent for a request of a user, and returns the UI message
 * stream of the AI SDK. The output of each tool call in the stream has the
 * batches of that call: the client applies them to its copy of the
 * proposal.
 *
 * The same function runs on a server (server mode: the route returns the
 * stream as the response) and in the browser (client mode: a chat
 * transport returns the stream).
 */
export async function streamDocumentAgent(
  request: DocumentAgentRequest,
  options: DocumentAgentOptions & {
    createEditor: CreateEditor;
    abortSignal?: AbortSignal;
  },
): Promise<ReadableStream<UIMessageChunk>> {
  // The proposal of the request is the state of this run. It lives in a
  // store for this request only.
  const store = createInMemoryProposalStore();
  await store.save("request", request.proposal);
  const handle = createDocumentHandle({
    store,
    proposalId: "request",
    createEditor: options.createEditor,
  });
  return createAgentUIStream({
    agent: createDocumentAgent(handle, options),
    uiMessages: request.messages,
    abortSignal: options.abortSignal,
  });
}

/** The result of a run without a chat: the answer of the agent, and the cost. */
export type DocumentAgentRun = {
  text: string;
  steps: number;
  usage: LanguageModelUsage;
};

/**
 * Runs the agent to the end for one prompt, without a UI stream. This is
 * for a run that a server starts: the batches go to the proposal store of
 * the handle.
 */
export async function runDocumentAgent(
  handle: DocumentHandle,
  prompt: string,
  options: DocumentAgentOptions & { abortSignal?: AbortSignal },
): Promise<DocumentAgentRun> {
  const result = await createDocumentAgent(handle, options).generate({
    prompt,
    abortSignal: options.abortSignal,
  });
  for (const part of toolErrorsOf(result.steps)) {
    // A tool threw: a bug. The run fails.
    throw "error" in part ? part.error : new Error("A document tool threw");
  }
  return {
    text: result.text,
    steps: result.steps.length,
    usage: result.usage,
  };
}
