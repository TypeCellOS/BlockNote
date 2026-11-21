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
 * The result of a merge write to a Y.Doc. With an error, the Y.Doc gets
 * only the updates of `base` that it did not have yet.
 *
 * The result has no `written` (see `MergedChangeOperations`): the document
 * that the client wrote has no Yjs state. Thus, after a write with
 * `changesOfOthers`, the client must read the text again before its next
 * write.
 */
export type YDocMergedChangeResult =
  | (MergedInFragment & {
      /** The Yjs update of the write, as a V2 update (see `YDocChangeResult`). */
      updateV2: Uint8Array;
    })
  | InvalidDocumentError
  | ConflictError;

/**
 * Writes a change (a text, or BlockNote JSON) to the fragment of a Y.Doc,
 * and merges it with the changes of other writers after `base`: the merge
 * write of `updateDocumentWithMerge`, for a Y.Doc. For the editor and
 * `base` (a Yjs state as a V2 update), see `updateYDoc`.
 *
 * The merge is three-way, by block ID (see `merge/document.ts`). A conflict
 * keeps the current value, or with `onConflict: "reject"`, nothing applies.
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
 * Writes a change (a text, or BlockNote JSON) to the fragment of a Y.Doc,
 * and lets Yjs merge it with the changes of other writers after `base`.
 * This function is experimental. For the editor and `base`, see
 * `updateYDoc`.
 *
 * Yjs merges the write as the write of a new Yjs client that started at
 * `base`. Yjs has no conflicts, thus there is no `onConflict` and no error
 * `"conflict"`. But a change of another writer can be lost: in a Y.Doc, a
 * move, a split and a join are a removal and an insert. The README has the
 * limits ("The merge of Yjs").
 *
 * For a base without content, the merge of `updateYDocWithMerge` runs (see
 * `yjsMerge`).
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
