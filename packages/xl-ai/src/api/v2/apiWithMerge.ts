import type { BlockNoteEditor } from "@blocknote/core";

import {
  type ChangeOfOthers,
  changesOfOthersOf,
  dispatchOperations,
  type InvalidDocumentError,
  type JSONChange,
  jsonTarget,
  requireBase,
  type TextChange,
  textTarget,
  updateFromTarget,
} from "./api.js";
import { fitResult, type FitWarning } from "./fit/index.js";
import { mergeDocument, type MergeWarning } from "./merge/index.js";
import type { LensBlock } from "./model.js";
import type { BlockOperation } from "./operations/index.js";
import type { TargetWarning } from "./target/index.js";
import {
  assertBlockIds,
  BlockIndex,
  schemaRulesOf,
} from "./util/blocks/index.js";

// The merge write: the change of the client, made at the version `base`,
// merges three-way with the changes of other writers after `base`. It runs
// the stages of the strict write (see `api.ts`) for `base`, with the
// document merge (stage 4) between stage 3 and stage 5:
//
//   mergedOperationsOf = mergeOf (the stages 1 to 3 for `base`, then
//                        4 Merge), the conflict rule, then operationsOfMerge
//                        (5 Fit, 6 Diff)

/** Each warning of a write. A strict write gives no `MergeWarning`. */
export type ChangeWarning = TargetWarning | MergeWarning | FitWarning;

/** A change with `onConflict: "reject"` that has conflicts: nothing applies. */
export type ConflictError = { error: "conflict"; conflicts: MergeWarning[] };

/**
 * The version that the client read (`base`), and what a conflict with a
 * change of another writer does (`onConflict`), for a merge write.
 */
export type MergeFromVersion<Base> = {
  /**
   * The version that the client read. Get it from your version history.
   * `"current"` is not allowed: there is nothing to merge.
   */
  base: Base;
  /**
   * What a conflict (a {@link MergeWarning}) does. Required: each call
   * states it.
   *
   * - `"reject"`: nothing applies, and the result is the error `"conflict"`,
   *   with the conflicts. This is the recommended value.
   * - `"keep-current"`: the change of the other writer stays there, and the
   *   result has the warning. The other changes of the client apply.
   */
  onConflict: "reject" | "keep-current";
};

/** A change of a merge write that applies: its operations and its warnings. */
export type MergedChangeOperations = {
  error?: undefined;
  operations: BlockOperation[];
  warnings: ChangeWarning[];
  /**
   * The blocks that other writers changed after `base`. The document after
   * the write has these changes too. A client (for example an AI agent)
   * that reads the document again sees these changes, which it did not
   * write.
   */
  changesOfOthers: ChangeOfOthers[];
  /**
   * The document as the client wrote it: the version of `base` with the
   * change of the client, and without the changes of other writers. Its text
   * is the text that the client has now. Thus, it is the `base` of the next
   * write of this client, if the client does not read the document again:
   * keep it as a version.
   *
   * The document after the write is not that base: it has changes that the
   * client did not see, and a write of the text of the client from it
   * removes them without a warning.
   */
  written: LensBlock[];
};

/**
 * The result of a merge write: the operations and the warnings, or an
 * error. On an error, the document does not change.
 *
 * - `"invalid-document"`: see {@link InvalidDocumentError}.
 * - `"conflict"`: see {@link MergeFromVersion}.
 */
export type MergedChangeResult =
  | MergedChangeOperations
  | InvalidDocumentError
  | ConflictError;

/**
 * A change of a client for a merge write: a text or BlockNote JSON, the
 * version that the client read, and what a conflict does.
 */
export type DocumentMergeChange = (TextChange | JSONChange) &
  MergeFromVersion<readonly LensBlock[]>;

/**
 * Computes the operations of a merge write. The client made the change at
 * the version `base`. The change merges three-way with the changes that
 * other writers made after `base` (see `merge/document.ts`): the operations
 * change the document of the editor, and keep the changes of other writers.
 * Nothing changes: `applyOperations` applies the operations to a
 * transaction of the caller. {@link updateDocumentWithMerge} computes and
 * applies them in one step.
 *
 * A write of the text of `base` without changes gives no operations.
 *
 * Throws as `computeOperations`: for a block without an ID, or two blocks
 * with one ID, in the document or in `base`.
 */
export function computeOperationsWithMerge(
  editor: BlockNoteEditor<any, any, any>,
  change: DocumentMergeChange,
): MergedChangeResult {
  return mergedOperationsOf(editor, change, editor.document);
}

/**
 * Computes the operations of a merge write (see
 * {@link computeOperationsWithMerge}), and applies them to the editor (see
 * {@link dispatchOperations}).
 */
export function updateDocumentWithMerge(
  editor: BlockNoteEditor<any, any, any>,
  change: DocumentMergeChange,
): MergedChangeResult {
  const update = computeOperationsWithMerge(editor, change);
  if (update.error === undefined) {
    dispatchOperations(editor, update.operations);
  }
  return update;
}

/**
 * The operations of a merge write for the document `current`: the merge of
 * the change with `current` (see {@link mergeOf}), the conflict rule, and
 * the operations (see {@link operationsOfMerge}).
 *
 * With `onConflict: "reject"`, a conflict of the merge gives the error
 * `"conflict"`, and no operations.
 *
 * @internal
 */
export function mergedOperationsOf(
  editor: BlockNoteEditor<any, any, any>,
  change: DocumentMergeChange,
  current: readonly LensBlock[],
): MergedChangeResult {
  requireBase(change.base);
  const merge = mergeOf(editor, change, change.base, current);
  if (merge.error !== undefined) {
    return merge;
  }
  if (change.onConflict === "reject" && merge.conflicts.length > 0) {
    return { error: "conflict", conflicts: merge.conflicts };
  }
  return operationsOfMerge(editor, merge, change.base, current);
}

/**
 * The merge of a change with the current document (the stages 1 to 4).
 *
 * @internal
 */
export type DocumentMerge = {
  error?: undefined;
  /** The target of the change for `base` (stage 3), and its warnings. */
  target: readonly LensBlock[];
  targetWarnings: TargetWarning[];
  /** The target, merged with the current document (stage 4). */
  merged: readonly LensBlock[];
  /** The conflicts of the merge. In each one, the current document won. */
  conflicts: MergeWarning[];
};

/**
 * The stages 1 to 4 of a merge write: the target of the change for the
 * version `base`, merged three-way with `current` (see `mergeDocument`). A
 * conflict is not an error here: the caller has the conflict rule.
 *
 * @internal
 */
export function mergeOf(
  editor: BlockNoteEditor<any, any, any>,
  change: TextChange | JSONChange,
  base: readonly LensBlock[],
  current: readonly LensBlock[],
): DocumentMerge | InvalidDocumentError {
  assertBlockIds(current, "current document");
  assertBlockIds(base, "base");
  const target =
    change.document === undefined
      ? textTarget(editor, change.format, base, change.text)
      : jsonTarget(editor, change.document);
  if (target.error !== undefined) {
    return target;
  }
  // A block of the client with the ID of a block that another writer added
  // after `base` gives two blocks with one ID. Only a JSON change can have
  // such a block. As in `parseJSON`, the lens does not repair it.
  const read = new BlockIndex(base);
  const now = new BlockIndex(current);
  const ids = new BlockIndex(target.target).ids;
  if (ids.some((id) => now.has(id) && !read.has(id))) {
    return { error: "invalid-document" };
  }
  // 4. Merge.
  const merged = mergeDocument({
    base,
    ours: target.target,
    theirs: current,
    contentKindOf: schemaRulesOf(editor.schema.blockSchema).contentKindOf,
  });
  return {
    target: target.target,
    targetWarnings: target.warnings,
    merged: merged.blocks,
    conflicts: merged.warnings,
  };
}

/**
 * The stages 5 and 6 of a merge write: the operations that change `current`
 * to the merged document, with the changes of other writers after `base`,
 * and the document that the client wrote.
 *
 * @internal
 */
export function operationsOfMerge(
  editor: BlockNoteEditor<any, any, any>,
  merge: DocumentMerge,
  base: readonly LensBlock[],
  current: readonly LensBlock[],
): MergedChangeOperations {
  const rules = schemaRulesOf(editor.schema.blockSchema);
  const update = updateFromTarget(rules, merge.merged, current);
  return {
    operations: update.operations,
    warnings: [...merge.targetWarnings, ...merge.conflicts, ...update.warnings],
    changesOfOthers: changesOfOthersOf(base, current),
    // The client wrote the target: it gets the fit for the version that the
    // client read.
    written: fitResult(rules, merge.target, base, false),
  };
}
