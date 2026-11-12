import type { BlockOperation, LensBlock } from "@blocknote/xl-ai/text-lens";

/**
 * Where a batch comes from.
 *
 * - `tool-call`: one editing tool call of the agent, with its reason.
 * - `rebase`: the changes of the main document that the proposal took. The
 *   main document at that time is the new fork point.
 * - `revert`: a user rejected one tool call. The batch reverts its changes.
 * - `accept`: a user accepted one tool call. The proposal document does not
 *   change. The fork point moves: it now contains the accepted changes.
 */
export type BatchSource =
  | { type: "tool-call"; toolCallId: string; reason: string }
  | { type: "rebase"; forkPoint: LensBlock[] }
  | { type: "revert"; toolCallId: string }
  | { type: "accept"; toolCallId: string; forkPoint: LensBlock[] };

/**
 * One step of a proposal: the operations that change the proposal document
 * of the batch before it into the proposal document of this batch.
 */
export type Batch = {
  /** The position of the batch in the proposal. The first batch has 1. */
  seq: number;
  source: BatchSource;
  /** The operations, with block IDs. They apply in sequence. */
  operations: BlockOperation[];
  /** The blocks that the operations change, add or remove. */
  changedBlockIds: string[];
  /** The hash of the proposal document after this batch (see `hashDocument`). */
  hash: string;
};

/**
 * The proposal P of an agent: a document that only the agent and the review
 * of a user write to. The main document does not change until a user
 * accepts.
 *
 * The proposal document is `origin` with all batches applied, in sequence.
 * The log only grows. Thus, a host can send the new batches to a client,
 * and each version of the proposal document stays available: version `n` is
 * `origin` with the first `n` batches.
 */
export type Proposal = {
  /** The main document when the run started. */
  origin: LensBlock[];
  batches: Batch[];
};
