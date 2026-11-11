import type { BlockNoteEditor } from "@blocknote/core";

import {
  type BlockOperation,
  type ChangeWarning,
  computeOperations,
  type JSONChange,
  type LensBlock,
  type MergeWarning,
  type WriteFromVersion,
} from "../../api/v2/index.js";
import {
  applyToEditor,
  type CreateEditor,
  forkPointOf,
  openProposal,
  writeBatch,
} from "./proposal.js";
import type { Batch, Proposal } from "./types.js";

/** A JSON write of the lens: the document that a writer wants, and the version that it read. */
type JSONWrite = JSONChange & WriteFromVersion<readonly LensBlock[]>;

/**
 * The write that accepts the full proposal: the proposal document onto the
 * current main document, with the fork point as the version that the
 * proposal read. Thus, the changes that other writers made to the main
 * document after the fork point stay.
 *
 * The caller applies it to the main document as a normal edit of the user
 * (`updateDocument`). The display of the suggestions uses the same write
 * (see `deriveSuggestions`).
 */
export function acceptAllChange(
  createEditor: CreateEditor,
  proposal: Proposal,
): JSONWrite {
  return {
    document: openProposal(createEditor, proposal).editor.document,
    base: forkPointOf(proposal),
  };
}

/** The batch of a tool call, or `undefined` if the proposal has no such tool call. */
export function toolCallBatch(
  proposal: Proposal,
  toolCallId: string,
): Batch | undefined {
  return proposal.batches.find(
    (batch) =>
      batch.source.type === "tool-call" &&
      batch.source.toolCallId === toolCallId,
  );
}

/** A review step for one tool call, or the error that the proposal has no such tool call. */
export type ReviewResult<T> =
  | ({ error?: undefined } & T)
  | { error: "unknown-tool-call" };

/**
 * Rejects one tool call: a write to the proposal that reverts the changes of
 * that call. The changes of the later batches stay (a three-way merge: the
 * document before the call, from the document after the call, onto the
 * proposal document now).
 *
 * The reject must be a write to the proposal. Else, the change comes back
 * in the next diff of the proposal and the main document.
 *
 * `batch` is `undefined` if nothing of the call is left to revert.
 */
export function revertToolCall(
  createEditor: CreateEditor,
  proposal: Proposal,
  toolCallId: string,
): ReviewResult<{ batch: Batch | undefined; warnings: ChangeWarning[] }> {
  const call = toolCallBatch(proposal, toolCallId);
  if (call === undefined) {
    return { error: "unknown-tool-call" };
  }
  const { editor, versions } = openProposal(createEditor, proposal, [
    call.seq - 1,
    call.seq,
  ]);
  const result = writeBatch(
    createEditor,
    editor,
    { document: versionOf(versions, call.seq - 1), base: versionOf(versions, call.seq) },
    proposal.batches.length + 1,
    { type: "revert", toolCallId },
  );
  if (result.error !== undefined) {
    // The two documents are versions of the proposal, and the write keeps
    // the current value on a conflict.
    throw new Error(`The revert of a tool call failed: ${result.error}`);
  }
  return result;
}

/**
 * Accepts one tool call. The result has two parts:
 *
 * - `change`: the write that applies the changes of that call to the main
 *   document, as a normal edit of the user (`updateDocument`).
 * - `batch`: a batch for the proposal that moves the fork point: the fork
 *   point with the changes of that call. The proposal document does not
 *   change. Then the next diff of the proposal and the main document does
 *   not show the accepted changes again, and a block that the call added is
 *   the same block in the two documents.
 */
export function acceptToolCall(
  createEditor: CreateEditor,
  proposal: Proposal,
  toolCallId: string,
): ReviewResult<{ change: JSONWrite; batch: Batch }> {
  const call = toolCallBatch(proposal, toolCallId);
  const last = proposal.batches.at(-1);
  if (call === undefined || last === undefined) {
    return { error: "unknown-tool-call" };
  }
  const { versions } = openProposal(createEditor, proposal, [
    call.seq - 1,
    call.seq,
  ]);
  const change: JSONWrite = {
    document: versionOf(versions, call.seq),
    base: versionOf(versions, call.seq - 1),
  };
  const forkPoint = createEditor(forkPointOf(proposal));
  applyChange(forkPoint, change);
  return {
    change,
    batch: {
      seq: proposal.batches.length + 1,
      source: { type: "accept", toolCallId, forkPoint: forkPoint.document },
      operations: [],
      changedBlockIds: [],
      hash: last.hash,
    },
  };
}

/**
 * Applies a JSON write of two versions of a proposal to a headless editor.
 * Returns the operations and the warnings of the merge.
 */
export function applyChange(
  editor: BlockNoteEditor<any, any, any>,
  change: JSONWrite,
): { operations: BlockOperation[]; warnings: ChangeWarning[] } {
  const result = computeOperations(editor, change);
  if (result.error !== undefined) {
    // The document is a version of a proposal: it fits the schema. The
    // write keeps the current value on a conflict.
    throw new Error(`The write of a proposal version failed: ${result.error}`);
  }
  applyToEditor(editor, result.operations);
  return result;
}

/** The warnings of a merge (see `MergeWarning`): the changes that did not apply. */
export function mergeWarningsOf(warnings: ChangeWarning[]): MergeWarning[] {
  return warnings.flatMap((warning) =>
    warning.type === "change-to-removed-block" ||
    warning.type === "removed-changed-block" ||
    warning.type === "conflicting-change"
      ? [warning]
      : [],
  );
}

function versionOf(
  versions: Map<number, LensBlock[]>,
  seq: number,
): LensBlock[] {
  const version = versions.get(seq);
  if (version === undefined) {
    throw new Error(`The proposal has no version ${seq}`);
  }
  return version;
}
