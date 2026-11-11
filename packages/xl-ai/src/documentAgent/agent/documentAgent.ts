import {
  createAgentUIStream,
  generateId,
  isStepCount,
  type LanguageModelUsage,
  type ModelMessage,
  ToolLoopAgent,
  type ToolLoopAgentSettings,
  type UIMessage,
  type UIMessageChunk,
} from "ai";

import type { CreateEditor } from "../proposal/proposal.js";
import type { Proposal } from "../proposal/types.js";
import { createInMemoryProposalStore } from "../stores/proposalStore.js";
import { createDocumentTools } from "../tools/aiSdkTools.js";
import { describeOpening } from "../tools/describe.js";
import { readDocument } from "../tools/documentTools.js";
import { createDocumentHandle, type DocumentHandle } from "../tools/handle.js";
import {
  createToolCalls,
  type DocumentToolName,
  type OnBatches,
} from "../tools/toolCalls.js";
import {
  type LanguageModelObject,
  withBatchChunks,
  withEarlyToolCalls,
} from "./earlyToolCalls.js";
import { DOCUMENT_AGENT_INSTRUCTIONS } from "./instructions.js";

/** The options of the loop that all hosts share. */
export type DocumentAgentOptions = {
  /** The model, as an object: a middleware wraps it (see `withEarlyToolCalls`). */
  model: LanguageModelObject;
  /** The instructions of the agent. The default explains the tools and the loop. */
  instructions?: string;
  /** The maximum number of LLM steps of one run. The default is 12. */
  maxSteps?: number;
  /**
   * The maximum number of output tokens of one LLM step. A write of the
   * full document needs sufficient tokens for the document.
   */
  maxOutputTokens?: number;
  /**
   * How much the model reasons before it answers (the `reasoning` setting
   * of the AI SDK). Less reasoning gives the first edit of a run earlier.
   * The default is the default of the provider.
   */
  reasoning?: ToolLoopAgentSettings["reasoning"];
  /**
   * The tools that the model can use. The default is all document tools.
   * An app can leave out a tool, for example for a measurement.
   */
  tools?: DocumentToolName[];
};

/**
 * The agent: a multi-step tool loop of the AI SDK (`ToolLoopAgent`) with
 * the document tools of one handle. Each tool result goes back to the
 * model. The loop stops when the model answers without a tool call, or at
 * the step limit.
 *
 * The first LLM call of a run gets the document with the last message of
 * the user (see {@link withDocument}). Thus, the model does not call
 * `readDocument` before its first change, and a run has one LLM call less.
 *
 * A tool call starts when the model has written it completely, not at the
 * end of the LLM step (see `withEarlyToolCalls`). `onBatches` gets the
 * batches of each tool call at that time, and the batch of a rebase in the
 * read for the first LLM call.
 *
 * All hosts use this function. A host only decides where the loop runs and
 * what the handle reads and writes.
 */
export function createDocumentAgent(
  handle: DocumentHandle,
  options: DocumentAgentOptions,
  onBatches?: OnBatches,
) {
  const calls = createToolCalls(handle, onBatches);
  return new ToolLoopAgent({
    model: withEarlyToolCalls(options.model, calls),
    instructions: options.instructions ?? DOCUMENT_AGENT_INSTRUCTIONS,
    tools: createDocumentTools(calls),
    maxOutputTokens: options.maxOutputTokens,
    reasoning: options.reasoning,
    activeTools: options.tools,
    stopWhen: [isStepCount(options.maxSteps ?? 12), toolThrew],
    // The AI SDK keeps the messages of step 0 for the later steps. Thus,
    // each LLM call of the run has the same document text at the same
    // place, and a prompt cache of the provider can use it.
    prepareStep: async ({ stepNumber, messages }) => {
      if (stepNumber > 0) {
        return {};
      }
      const opening = await readDocument(handle);
      if (opening.batches.length > 0) {
        onBatches?.(opening.batches);
      }
      return { messages: withDocument(messages, describeOpening(opening)) };
    },
  });
}

/**
 * Returns the messages with the document text at the start of the last
 * message of a user. The document is before the request of the user: a
 * model answers a request after a long text better than before it.
 *
 * Only the last message gets the document. The earlier messages of a chat
 * do not have the documents of their runs: these documents are old.
 */
export function withDocument(
  messages: readonly ModelMessage[],
  document: string,
): ModelMessage[] {
  let index = messages.length - 1;
  while (index >= 0 && messages[index].role !== "user") {
    index--;
  }
  const message = messages[index];
  if (message?.role !== "user") {
    throw new Error("The run has no message of a user");
  }
  const content =
    typeof message.content === "string"
      ? [{ type: "text" as const, text: message.content }]
      : message.content;
  return [
    ...messages.slice(0, index),
    { ...message, content: [{ type: "text", text: document }, ...content] },
    ...messages.slice(index + 1),
  ];
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
 * stream of the AI SDK. The client applies the batches of each tool call
 * to its copy of the proposal. The batches are in the stream two times:
 *
 * - In a transient data chunk, when the tool call ends. This is before the
 *   end of the LLM step: the client shows the change at once.
 * - In the output of the tool call, when the loop of the AI SDK has it.
 *   This output stays in the chat history.
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
  return streamDocumentAgentOnHandle(handle, request.messages, options);
}

/**
 * Runs the agent on the handle of a host for the messages of a chat, and
 * returns the UI message stream (see {@link streamDocumentAgent}). A host
 * that keeps the proposal and the chat uses this function directly (see
 * `sessions/sessionHost.ts`): `onEnd` gets the message of the agent at the
 * end of the run, with its tool calls and its answer.
 */
export async function streamDocumentAgentOnHandle(
  handle: DocumentHandle,
  messages: UIMessage[],
  options: DocumentAgentOptions & {
    abortSignal?: AbortSignal;
    onEnd?: (responseMessage: UIMessage) => void;
  },
): Promise<ReadableStream<UIMessageChunk>> {
  // The agent starts before the stream exists. Thus, the listener gets the
  // function that adds to the stream when the stream is there.
  let add: OnBatches = () => undefined;
  const { onEnd } = options;
  const chunks = withBatchChunks(
    await createAgentUIStream({
      agent: createDocumentAgent(handle, options, (batches, toolCallId) =>
        add(batches, toolCallId),
      ),
      uiMessages: messages,
      abortSignal: options.abortSignal,
      // A host that keeps the chat gives the message of the agent an ID.
      // Thus, the message has the same ID on the host and in each client.
      generateMessageId: onEnd === undefined ? undefined : generateId,
      onEnd: (event) => onEnd?.(event.responseMessage),
    }),
  );
  add = chunks.add;
  return chunks.stream;
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
