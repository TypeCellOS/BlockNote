import type { BlockNoteEditor } from "@blocknote/core";
import { yfragmentToBlocks } from "@blocknote/core/y";
import * as Y from "@y/y";

import {
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
} from "../apiWithMerge.js";
import { diffDocuments } from "../operations/index.js";
import {
  applyYDocOperations,
  docOf,
  fragmentAtBase,
  hasVersion,
  type UnknownBaseError,
} from "./yjsApi.js";

/**
 * The result of `computeYDocOperationsWithMerge`: the operations and the
 * warnings of the merge, or an error.
 *
 * The result has no `written` (see `MergedChangeOperations`): the document
 * that the client wrote has no Yjs state. Thus, after a write with
 * `changesOfOthers`, the client must read the text again before its next
 * write.
 */
export type YDocMergedOperationsResult =
  | MergedInFragment
  | InvalidDocumentError
  | ConflictError
  | UnknownBaseError;

/**
 * The result of a merge write to a Y.Doc: the result of
 * `computeYDocOperationsWithMerge`, and the Yjs update of a write that
 * applies. With an error, the Y.Doc does not change.
 */
export type YDocMergedChangeResult =
  | (MergedInFragment & {
      /** The Yjs update of the write, as a V2 update (see `YDocChangeResult`). */
      updateV2: Uint8Array;
    })
  | InvalidDocumentError
  | ConflictError
  | UnknownBaseError;

/**
 * Computes the operations of a merge write to the fragment of a Y.Doc:
 * `computeOperationsWithMerge`, for a Y.Doc. The change merges with the
 * changes of other writers after `base`. Nothing changes:
 * `applyYDocOperations` writes the operations. `updateYDocWithMerge`
 * computes and writes them in one step. For the editor and `base` (a Yjs
 * state as a V2 update), see `computeYDocOperations`.
 *
 * The merge is three-way, by block ID (see `merge/document.ts`). A conflict
 * keeps the current value, or with `onConflict: "reject"`, nothing applies.
 */
export function computeYDocOperationsWithMerge(
  editor: BlockNoteEditor<any, any, any>,
  fragment: Y.Node,
  change: (TextChange | JSONChange) & MergeFromVersion<Uint8Array>,
): YDocMergedOperationsResult {
  const ydoc = docOf(fragment);
  requireBase(change.base);
  const atBase = fragmentAtBase(fragment, change.base);
  if (!hasVersion(ydoc, docOf(atBase))) {
    return { error: "unknown-base" };
  }
  const base = yfragmentToBlocks(editor, atBase);
  const current = yfragmentToBlocks(editor, fragment);
  const merged = mergedOperationsOf(editor, { ...change, base }, current);
  return merged.error !== undefined ? merged : withoutWritten(merged);
}

/**
 * Computes the operations of a merge write (see
 * `computeYDocOperationsWithMerge`), and writes them to the fragment (see
 * `applyYDocOperations`): `updateDocumentWithMerge`, for a Y.Doc.
 */
export function updateYDocWithMerge(
  editor: BlockNoteEditor<any, any, any>,
  fragment: Y.Node,
  change: (TextChange | JSONChange) & MergeFromVersion<Uint8Array>,
): YDocMergedChangeResult {
  const update = computeYDocOperationsWithMerge(editor, fragment, change);
  return update.error !== undefined
    ? update
    : {
        ...update,
        updateV2: applyYDocOperations(editor, fragment, update.operations),
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
 * For a base without content, the merge of `updateYDocWithMerge` runs.
 */
export function experimental_updateYDocWithYjsMerge(
  editor: BlockNoteEditor<any, any, any>,
  fragment: Y.Node,
  change: (TextChange | JSONChange) & { base: Uint8Array },
): Exclude<YDocMergedChangeResult, ConflictError> {
  const ydoc = docOf(fragment);
  requireBase(change.base);
  const atBase = fragmentAtBase(fragment, change.base);
  if (!hasVersion(ydoc, docOf(atBase))) {
    return { error: "unknown-base" };
  }
  const base = yfragmentToBlocks(editor, atBase);
  if (base.length === 0) {
    // A base without content: a copy of an empty Y.Doc gets its own root
    // block group, and Yjs cannot merge two new root groups into one. Thus,
    // the lens merges. Each block of the two writers is a new block, thus
    // this merge has no conflict.
    const merged = updateYDocWithMerge(editor, fragment, {
      ...change,
      onConflict: "keep-current",
    });
    if (merged.error === "conflict") {
      throw new Error("A merge with `keep-current` gives no conflict error.");
    }
    return merged;
  }
  // The write sees only `base`, and the layout blocks stay (`keepLayout`).
  const written = operationsOf(editor, change, base, true);
  if (written.error !== undefined) {
    return written;
  }
  const changesOfOthers = diffDocuments(
    base,
    yfragmentToBlocks(editor, fragment),
  );
  // The write goes to the fragment at `base`, in its temporary Y.Doc. The
  // Y.Doc gets the Yjs update of that write, and Yjs merges it.
  const updateV2 = applyYDocOperations(editor, atBase, written.operations);
  Y.applyUpdateV2(ydoc, updateV2);
  return { ...written, changesOfOthers, updateV2 };
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
