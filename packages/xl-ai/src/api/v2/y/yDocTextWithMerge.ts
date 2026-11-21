import type { BlockNoteEditor } from "@blocknote/core";
import { yfragmentToBlocks } from "@blocknote/core/y";
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
import { docOf, fragmentAtBase, writeOperations } from "./yDocText.js";

/**
 * The result of a merge write to a Y.Doc. With an error in the result, the
 * write did not change the Y.Doc: only the updates of `base` that the Y.Doc
 * did not have yet apply. For an exception, see `updateYDoc`.
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
      /**
       * The Yjs update of the write, in the V2 format: apply it with
       * `Y.applyUpdateV2`. Send it to the other clients, if no provider does
       * that.
       */
      updateV2: Uint8Array;
    })
  | InvalidDocumentError
  | ConflictError;

/**
 * Writes a change (a text, or BlockNote JSON) back to the fragment of a
 * Y.Doc, and merges it with the changes of other writers after `base`: the
 * merge write of `updateDocumentWithMerge`, for a Y.Doc. The editor gives
 * the schema and the conversions (see `updateYDoc`).
 *
 * `base` is the Yjs state at the version that the client read, as a V2
 * update (`Y.encodeStateAsUpdateV2`, see `updateYDoc`). The target of the
 * change for `base` merges three-way with the current document, by block ID
 * (see `merge/document.ts`), and the operations apply to the current
 * document. A conflict keeps the current value, or with
 * `onConflict: "reject"`, nothing applies.
 */
export function updateYDocWithMerge(
  editor: BlockNoteEditor<any, any, any>,
  fragment: Y.Node,
  change: (TextChange | JSONChange) & MergeFromVersion<Uint8Array>,
): YDocMergedChangeResult {
  const ydoc = docOf(fragment);
  requireBase(change.base);
  const before = Y.encodeStateVector(ydoc);
  const base = yfragmentToBlocks(editor, fragmentAtBase(fragment, change.base));
  Y.applyUpdateV2(ydoc, change.base);
  const current = yfragmentToBlocks(editor, fragment);
  const merged = mergedOperationsOf(editor, { ...change, base }, current);
  if (merged.error !== undefined) {
    return merged;
  }
  writeOperations(editor, fragment, merged.operations);
  return {
    ...withoutWritten(merged),
    updateV2: Y.encodeStateAsUpdateV2(ydoc, before),
  };
}

/**
 * Writes a change (a text, or BlockNote JSON) back to the fragment of a
 * Y.Doc, and lets Yjs merge it with the changes of other writers after
 * `base` (the Yjs state at the version that the client read, as a V2
 * update). The editor gives the schema and the conversions (see
 * `updateYDoc`). This function is experimental.
 *
 * The operations for `base` apply to a copy of the Y.Doc at `base` (a
 * temporary Y.Doc, thus a new Yjs client for each write), and Yjs merges
 * the copy into the Y.Doc. The operations of the result are for `base`.
 * Yjs has no conflicts, thus there is no `onConflict` and no error
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
  const atBase = fragmentAtBase(fragment, change.base);
  Y.applyUpdateV2(ydoc, change.base);
  const result = yjsMerge(editor, fragment, atBase, change);
  return result.error !== undefined
    ? result
    : { ...result, updateV2: Y.encodeStateAsUpdateV2(ydoc, before) };
}

/**
 * The write of `experimental_updateYDocWithYjsMerge`, for each case of
 * `base`. `atBase` is the fragment at `base`, in a temporary Y.Doc.
 */
function yjsMerge(
  editor: BlockNoteEditor<any, any, any>,
  fragment: Y.Node,
  atBase: Y.Node,
  change: TextChange | JSONChange,
): MergedInFragment | InvalidDocumentError {
  const base = yfragmentToBlocks(editor, atBase);
  const current = yfragmentToBlocks(editor, fragment);
  if (base.length === 0) {
    // A base without content: a copy of an empty Y.Doc gets its own root
    // block group, and Yjs cannot merge two new root groups into one. Thus,
    // the lens merges, and the write goes to the fragment.
    const merge = mergeOf(editor, change, base, current);
    if (merge.error !== undefined) {
      return merge;
    }
    const merged = withoutWritten(
      operationsOfMerge(editor, merge, base, current),
    );
    writeOperations(editor, fragment, merged.operations);
    return merged;
  }
  // The write goes to the fragment at `base`, and Yjs merges the temporary
  // Y.Doc into the Y.Doc. The write sees only `base`, and the layout blocks
  // stay (`keepLayout`).
  const written = operationsOf(editor, change, base, true);
  if (written.error !== undefined) {
    return written;
  }
  writeOperations(editor, atBase, written.operations);
  const ydoc = docOf(fragment);
  Y.applyUpdateV2(
    ydoc,
    Y.encodeStateAsUpdateV2(docOf(atBase), Y.encodeStateVector(ydoc)),
  );
  return { ...written, changesOfOthers: changesOfOthersOf(base, current) };
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
