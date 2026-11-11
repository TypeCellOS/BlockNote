import type { LensBlock, MergeWarning } from "../../api/v2/index.js";
import { type CreateEditor, withBatch } from "../proposal/proposal.js";
import { rebaseProposal } from "../proposal/rebase.js";
import type { Batch, Proposal } from "../proposal/types.js";
import type { ProposalStore } from "../stores/proposalStore.js";

/**
 * One step of a tool on the proposal: the batch to save (if any), and the
 * result of the tool. `dropped` has the changes of the agent that the
 * rebase before this step dropped, because a user changed the same part of
 * the main document.
 */
export type ProposalStep<T> = (
  proposal: Proposal,
  dropped: MergeWarning[],
) => {
  batch: Batch | undefined;
  result: T;
};

/** The result of a step, with the batches that the handle saved. */
export type StepOutcome<T> = {
  result: T;
  /**
   * The batches that the handle saved in this step, in sequence: the batch
   * of a rebase, then the batch of the tool. A client that follows the run
   * applies them to its copy of the proposal.
   */
  batches: Batch[];
};

/**
 * The document that the tools of an agent read and write: the proposal of
 * one run. The tools are plain functions over this handle. Thus, the loop
 * of the AI SDK, an MCP server or a test can call them.
 */
export type DocumentHandle = {
  /** Makes a headless editor with the schema of the app, for one call. */
  createEditor: CreateEditor;
  /**
   * Runs one step on the proposal. The handle loads the proposal, rebases
   * it onto the main document (if the host can read the main document),
   * runs the step, and saves the batch of the step. The steps of one handle
   * run one at a time: the loop can call two tools at the same time.
   */
  update<T>(step: ProposalStep<T>): Promise<StepOutcome<T>>;
};

/**
 * Makes the handle of one run. This is the only place where the hosts are
 * different:
 *
 * - Without `readMain`, the proposal changes only through the tools. This
 *   is a run that a user starts: the client sends the proposal with the
 *   request, and the host cannot read the main document.
 * - With `readMain`, each step first rebases the proposal onto the current
 *   main document (see `rebaseProposal`). This is a run that a server
 *   starts.
 */
export function createDocumentHandle(options: {
  store: ProposalStore;
  proposalId: string;
  createEditor: CreateEditor;
  readMain?: () => Promise<LensBlock[] | undefined>;
}): DocumentHandle {
  const { store, proposalId, createEditor, readMain } = options;
  let queue: Promise<unknown> = Promise.resolve();

  async function runStep<T>(step: ProposalStep<T>): Promise<StepOutcome<T>> {
    let proposal = await store.load(proposalId);
    if (proposal === undefined) {
      throw new Error(`The store has no proposal ${proposalId}`);
    }
    const batches: Batch[] = [];
    let dropped: MergeWarning[] = [];
    const main = await readMain?.();
    if (main !== undefined) {
      const rebase = rebaseProposal(createEditor, proposal, main);
      dropped = rebase.dropped;
      if (rebase.batch !== undefined) {
        batches.push(rebase.batch);
        proposal = withBatch(proposal, rebase.batch);
      }
    }
    const { batch, result } = step(proposal, dropped);
    if (batch !== undefined) {
      batches.push(batch);
      proposal = withBatch(proposal, batch);
    }
    if (batches.length > 0) {
      await store.save(proposalId, proposal);
    }
    return { result, batches };
  }

  return {
    createEditor,
    update(step) {
      const run = queue.then(() => runStep(step));
      // A step that throws must not stop the steps after it.
      queue = run.catch(() => undefined);
      return run;
    },
  };
}
