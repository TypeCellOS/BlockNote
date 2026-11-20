import type { BlockNoteEditor } from "@blocknote/core";
import * as Y from "yjs";

import {
  changesOfOthersOf,
  dispatchOperations,
  type InvalidDocumentError,
  type JSONChange,
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
import {
  applyBase,
  boundYDoc,
  writeInFork,
  writeToEditor,
} from "./yDocText.js";

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
  | (MergedInEditor & {
      /** The Yjs update of the write. Send it to the other clients, if no provider does that. */
      update: Uint8Array;
    })
  | InvalidDocumentError
  | ConflictError;

/**
 * Writes a change (a text, or BlockNote JSON) back to a Y.Doc, and merges it
 * with the changes of other writers after `base`: the merge write of
 * `updateDocumentWithMerge`, for a Y.Doc. The editor must be bound to the
 * fragment and mounted (see `updateYDoc`).
 *
 * `base` is the Yjs state `Y.encodeStateAsUpdate` at the version that the
 * client read. The target of the change for `base` merges three-way with the
 * current document, by block ID (see `merge/document.ts`), and the
 * operations apply to the current document. A conflict keeps the current
 * value, or with `onConflict: "reject"`, nothing applies.
 */
export function updateYDocWithMerge(
  editor: BlockNoteEditor<any, any, any>,
  fragment: Y.XmlFragment,
  change: (TextChange | JSONChange) & MergeFromVersion<Uint8Array>,
): YDocMergedChangeResult {
  const { fork, ydoc } = boundYDoc(editor, fragment);
  requireBase(change.base);
  const before = Y.encodeStateVector(ydoc);
  const base = applyBase(editor, ydoc, fragment, change.base);
  const result = writeInFork(fork, undefined, () => {
    if (base.content === "none-as-now") {
      return writeWithoutOthers(editor, change);
    }
    const merged = mergedOperationsOf(
      editor,
      { ...change, base: base.blocks },
      editor.document,
    );
    return merged.error !== undefined ? merged : dispatchMerge(editor, merged);
  });
  return result.error !== undefined
    ? result
    : { ...result, update: Y.encodeStateAsUpdate(ydoc, before) };
}

/**
 * Writes a change (a text, or BlockNote JSON) back to a Y.Doc, and lets Yjs
 * merge it with the changes of other writers after `base` (the Yjs state at
 * the version that the client read). The editor must be bound to the
 * fragment and mounted (see `updateYDoc`). This function is experimental.
 *
 * The operations for `base` apply to a fork of the Y.Doc at `base` (see
 * `ForkYDocExtension`), and Yjs merges the fork into the Y.Doc. The
 * operations of the result are for `base`. Yjs has no conflicts, thus there
 * is no `onConflict` and no error `"conflict"`: Yjs keeps the inserts of the
 * two writers, and a removal removes the changes of other writers in the
 * removed block. With y-prosemirror v13, a move, a split and a join are a
 * removal and an insert, and a change of the type replaces the content node
 * of the block. Thus, if two writers move the same block, the block is there
 * two times, and a change of another writer to a block that the text moves,
 * splits, joins or changes the type of, can be lost. The layout blocks
 * stay, also if they become empty: Yjs cannot merge the removal of a column
 * with a block that another writer adds to it.
 *
 * For a base without content, the merge of `updateYDocWithMerge` runs: a
 * fork of an empty document gets its own root block group, and Yjs cannot
 * merge two new root structures into one. This merge has no conflicts: each
 * block of the two writers is a new block.
 */
export function experimental_updateYDocWithYjsMerge(
  editor: BlockNoteEditor<any, any, any>,
  fragment: Y.XmlFragment,
  change: (TextChange | JSONChange) & { base: Uint8Array },
): Exclude<YDocMergedChangeResult, ConflictError> {
  const { fork, ydoc } = boundYDoc(editor, fragment);
  requireBase(change.base);
  const before = Y.encodeStateVector(ydoc);
  const base = applyBase(editor, ydoc, fragment, change.base);
  const current = editor.document;
  // With content at `base`, the write goes to a fork of the Y.Doc at
  // `base`, and Yjs merges it. Else, it goes to a fork of the current Y.Doc.
  const forkAt = base.content === "blocks" ? change.base : undefined;
  const result = writeInFork(fork, forkAt, () => {
    switch (base.content) {
      case "blocks": {
        // The layout blocks stay (`keepLayout`). The write sees only
        // `base`: the changes of other writers come from `base` and the
        // current document.
        const written = writeToEditor(editor, change, true);
        return written.error !== undefined
          ? written
          : {
              ...written,
              changesOfOthers: changesOfOthersOf(base.blocks, current),
            };
      }
      case "none-as-now":
        return writeWithoutOthers(editor, change);
      case "none": {
        const merge = mergeOf(editor, change, base.blocks, editor.document);
        return merge.error !== undefined
          ? merge
          : dispatchMerge(
              editor,
              operationsOfMerge(editor, merge, base.blocks, editor.document),
            );
      }
    }
  });
  return result.error !== undefined
    ? result
    : { ...result, update: Y.encodeStateAsUpdate(ydoc, before) };
}

/** A merge write that the bound editor has: the result without `written` (see `YDocMergedChangeResult`). */
type MergedInEditor = Omit<MergedChangeOperations, "written">;

/**
 * Writes the change to a fragment without content, from a base without
 * content. These are the same empty document, thus there is no merge, and
 * no other writer changed a block.
 */
function writeWithoutOthers(
  editor: BlockNoteEditor<any, any, any>,
  change: TextChange | JSONChange,
): MergedInEditor | InvalidDocumentError {
  const written = writeToEditor(editor, change, false);
  return written.error !== undefined
    ? written
    : { ...written, changesOfOthers: [] };
}

/** Applies the operations of a merge to the editor. */
function dispatchMerge(
  editor: BlockNoteEditor<any, any, any>,
  { written: _written, ...merged }: MergedChangeOperations,
): MergedInEditor {
  dispatchOperations(editor, merged.operations);
  return merged;
}
