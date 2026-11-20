import type { BlockNoteEditor } from "@blocknote/core";
import * as Y from "@y/y";

import {
  changesOfOthersOf,
  type InvalidDocumentError,
  type JSONChange,
  operationsOf,
  requireBase,
  type TextChange,
} from "../api.js";
import {
  type ConflictError,
  type MergedChangeOperations,
  mergedOperationsOf,
  type MergeFromVersion,
  mergeOf,
  operationsOfMerge,
} from "../apiWithMerge.js";
import type { LensBlock } from "../model.js";
import { applyBase, blocksOf, docOf, writeToCopy } from "./yDocText.js";

/**
 * The result of a merge write to a Y.Doc. On an error (also an exception),
 * the write does not change the Y.Doc. Only the updates of `base` that the
 * Y.Doc did not have yet apply (see `updateYDoc`).
 *
 * The result does not have the document that the client wrote (`written` of
 * `MergedChangeOperations`): `base` is a Yjs state here, and a Yjs state of
 * that document does not exist. Thus, after a write with `changesOfOthers`,
 * the Y.Doc has changes that the client did not see: the client must read
 * the text again before its next write (see the README, "Items that are not
 * done").
 */
export type YDocMergedChangeResult =
  | (MergedInFragment & {
      /** The Yjs update of the write. Send it to the other clients, if no provider does that. */
      update: Uint8Array;
    })
  | InvalidDocumentError
  | ConflictError;

/**
 * Writes a change (a text, or BlockNote JSON) back to the fragment of a
 * Y.Doc, and merges it with the changes of other writers after `base`: the
 * merge write of `updateDocumentWithMerge`, for a Y.Doc. The editor gives
 * the schema and the conversions (see `updateYDoc`).
 *
 * `base` is the Yjs state `Y.encodeStateAsUpdate` at the version that the
 * client read. The target of the change for `base` merges three-way with the
 * current document, by block ID (see `merge/document.ts`), and the
 * operations apply to the current document. A conflict keeps the current
 * value, or with `onConflict: "reject"`, nothing applies.
 */
export function updateYDocWithMerge(
  editor: BlockNoteEditor<any, any, any>,
  fragment: Y.Node,
  change: (TextChange | JSONChange) & MergeFromVersion<Uint8Array>,
): YDocMergedChangeResult {
  const ydoc = docOf(fragment);
  requireBase(change.base);
  const before = Y.encodeStateVector(ydoc);
  const base = applyBase(editor, fragment, change.base);
  const result = writeToCopy(
    editor,
    fragment,
    undefined,
    (current): MergedInFragment | InvalidDocumentError | ConflictError => {
      const merged = mergedOperationsOf(editor, { ...change, base }, current);
      return merged.error !== undefined ? merged : withoutWritten(merged);
    },
  );
  return result.error !== undefined
    ? result
    : { ...result, update: Y.encodeStateAsUpdate(ydoc, before) };
}

/**
 * Writes a change (a text, or BlockNote JSON) back to the fragment of a
 * Y.Doc, and lets Yjs merge it with the changes of other writers after
 * `base` (the Yjs state at the version that the client read). The editor
 * gives the schema and the conversions (see `updateYDoc`). This function is
 * experimental.
 *
 * The operations for `base` apply to a copy of the Y.Doc at `base`, and Yjs
 * merges the copy into the Y.Doc. The operations of the result are for
 * `base`. Yjs has no conflicts, thus there is no `onConflict` and no error
 * `"conflict"`: Yjs keeps the inserts of the two writers, and a removal
 * removes the changes of other writers in the removed block. In a Y.Doc, a
 * move, a split and a join are a removal and an insert, and a change of the
 * type replaces the block. Thus, if two writers move the same block, the
 * block is there two times, and a change of another writer to a block that
 * the text moves, splits, joins or changes the type of, can be lost. The
 * layout blocks stay, also if they become empty: Yjs cannot merge the
 * removal of a column with a block that another writer adds to it.
 *
 * For a base without content, the merge of `updateYDocWithMerge` runs: a
 * copy of an empty document gets its own root block group, and Yjs cannot
 * merge two new root structures into one. This merge has no conflicts: each
 * block of the two writers is a new block.
 */
export function experimental_updateYDocWithYjsMerge(
  editor: BlockNoteEditor<any, any, any>,
  fragment: Y.Node,
  change: (TextChange | JSONChange) & { base: Uint8Array },
): Exclude<YDocMergedChangeResult, ConflictError> {
  const ydoc = docOf(fragment);
  requireBase(change.base);
  const before = Y.encodeStateVector(ydoc);
  const base = applyBase(editor, fragment, change.base);
  const current = blocksOf(editor, fragment);
  const result = yjsMerge(editor, fragment, change, base, current);
  return result.error !== undefined
    ? result
    : { ...result, update: Y.encodeStateAsUpdate(ydoc, before) };
}

/** The write of `experimental_updateYDocWithYjsMerge`, for each case of `base`. */
function yjsMerge(
  editor: BlockNoteEditor<any, any, any>,
  fragment: Y.Node,
  change: (TextChange | JSONChange) & { base: Uint8Array },
  base: readonly LensBlock[],
  current: readonly LensBlock[],
): MergedInFragment | InvalidDocumentError {
  if (base.length > 0) {
    // The write goes to a copy of the Y.Doc at `base`, and Yjs merges it.
    // The write sees only `base`, and the layout blocks stay (`keepLayout`).
    const written = writeToCopy(editor, fragment, change.base, (atBase) =>
      operationsOf(editor, change, atBase, true),
    );
    return written.error !== undefined
      ? written
      : { ...written, changesOfOthers: changesOfOthersOf(base, current) };
  }
  // A base without content: a copy of an empty Y.Doc gets its own root block
  // group, and Yjs cannot merge two new root groups into one.
  return writeToCopy(editor, fragment, undefined, (now) => {
    const merge = mergeOf(editor, change, base, now);
    return merge.error !== undefined
      ? merge
      : withoutWritten(operationsOfMerge(editor, merge, base, now));
  });
}

/** A merge write to a fragment: the result without `written` (see `YDocMergedChangeResult`). */
type MergedInFragment = Omit<MergedChangeOperations, "written">;

/** The result of a merge write, without the document that the client wrote. */
function withoutWritten({
  written: _written,
  ...merged
}: MergedChangeOperations): MergedInFragment {
  return merged;
}
