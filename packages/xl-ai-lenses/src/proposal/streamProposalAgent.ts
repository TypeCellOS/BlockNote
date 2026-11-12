import type { UIMessage, UIMessageChunk } from "ai";

import {
  type DocumentAgentOptions,
  streamAgentOnDocument,
} from "../agent/documentAgent.js";
import { createInMemoryProposalStore } from "../stores/proposalStore.js";
import { batchesChunk } from "./chunks.js";
import type { CreateEditor } from "./proposal.js";
import { createProposalDocument } from "./proposalDocument.js";
import type { Proposal } from "./types.js";

/**
 * The request of a run that a user starts: the chat messages, and the copy
 * of the proposal that the client has. The host has no state of its own.
 */
export type DocumentAgentRequest = {
  messages: UIMessage[];
  proposal: Proposal;
};

/**
 * Runs the agent for a request of a user in proposal mode, and returns the
 * UI message stream of the AI SDK. The client applies the batches of each
 * tool call to its copy of the proposal. The batches are in the stream two
 * times:
 *
 * - In a transient data chunk, when the tool call ends (see
 *   `streamAgentOnDocument`).
 * - In the output of the tool call, when the loop of the AI SDK has it.
 *   This output stays in the chat history.
 *
 * The same function runs on a server (server mode) and in the browser
 * (client mode).
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
  const document = createProposalDocument({
    store,
    proposalId: "request",
    createEditor: options.createEditor,
  });
  return streamAgentOnDocument(document, request.messages, {
    ...options,
    extraChunk: batchesChunk,
  });
}
