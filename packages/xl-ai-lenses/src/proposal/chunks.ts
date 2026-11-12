import type { UIMessageChunk } from "ai";

import type { ProposalExtra } from "./proposalDocument.js";
import type { Batch, Proposal } from "./types.js";

// The stream chunks of proposal mode. A client that follows a run gets the
// proposal and its new batches through the UI message stream of the run.

/**
 * The type of the stream chunk with the batches of a tool call that
 * started early. The chunk is transient: it is not a part of the chat
 * message. The tool output has the same batches later.
 */
export const DOCUMENT_BATCHES_CHUNK = "data-document-batches";

/**
 * The data of a {@link DOCUMENT_BATCHES_CHUNK} chunk. `toolCallId` is the
 * tool call that added the batches. It is `undefined` for the read of the
 * document at the start of a run, which can rebase the proposal.
 */
export type DocumentBatchesData = { toolCallId?: string; batches: Batch[] };

/**
 * The type of the stream chunk with the proposal at the start of a run. A
 * host that keeps the proposal sends it (see `sessions/sessionHost.ts`):
 * the client takes this proposal as its copy. The chunk is transient.
 */
export const DOCUMENT_PROPOSAL_CHUNK = "data-document-proposal";

/** The data of a {@link DOCUMENT_PROPOSAL_CHUNK} chunk. */
export type DocumentProposalData = { proposal: Proposal };

/**
 * The stream chunk for the batches of one step of a run, or `undefined` if
 * the step added no batch (see `streamAgentOnDocument`).
 */
export function batchesChunk(
  extra: ProposalExtra,
  toolCallId?: string,
): UIMessageChunk | undefined {
  if (extra.batches.length === 0) {
    return undefined;
  }
  const data: DocumentBatchesData = { toolCallId, batches: extra.batches };
  return { type: DOCUMENT_BATCHES_CHUNK, data, transient: true };
}
