import type { LensBlock, MergeWarning } from "../../api/v2/index.js";
import { hashDocument } from "./hash.js";
import {
  type CreateEditor,
  forkPointOf,
  openProposal,
  writeBatch,
} from "./proposal.js";
import { applyChange, mergeWarningsOf } from "./review.js";
import type { Batch, Proposal } from "./types.js";

/**
 * Rebases the proposal onto the current main document. A host that can
 * read the main document does this before each tool call. Thus, the agent
 * sees the changes of the users, and gets feedback on its own changes.
 *
 * The rebase is a JSON write of the lens: the proposal document onto the
 * main document, with the fork point as the version that the proposal read.
 * On a conflict, the main document wins (`keep-current`). The result is the
 * new proposal document, and the main document is the new fork point.
 *
 * - `batch`: the batch that changes the proposal document into the rebased
 *   document, or `undefined` if the main document did not change after the
 *   fork point.
 * - `dropped`: the changes of the agent that did not stay, because a user
 *   changed the same part or removed the block. The host puts them in the
 *   tool result.
 */
export function rebaseProposal(
  createEditor: CreateEditor,
  proposal: Proposal,
  main: readonly LensBlock[],
): { batch: Batch | undefined; dropped: MergeWarning[] } {
  const forkPoint = forkPointOf(proposal);
  if (hashDocument(main) === hashDocument(forkPoint)) {
    return { batch: undefined, dropped: [] };
  }
  const { editor } = openProposal(createEditor, proposal);
  const before: LensBlock[] = editor.document;

  // The proposal document onto the main document.
  const mainEditor = createEditor(main);
  const { warnings } = applyChange(mainEditor, {
    document: before,
    base: forkPoint,
  });
  const rebased: LensBlock[] = mainEditor.document;

  // The batch changes the proposal document into the rebased document.
  const seq = proposal.batches.length + 1;
  const source = { type: "rebase" as const, forkPoint: [...main] };
  const result = writeBatch(
    createEditor,
    editor,
    { document: rebased, base: "current" },
    seq,
    source,
  );
  if (result.error !== undefined) {
    // `rebased` is the document of an editor: it fits the schema.
    throw new Error(`The rebase of a proposal failed: ${result.error}`);
  }
  return {
    // Without operations, the batch only moves the fork point.
    batch: result.batch ?? {
      seq,
      source,
      operations: [],
      changedBlockIds: [],
      hash: hashDocument(before),
    },
    dropped: mergeWarningsOf(warnings),
  };
}
