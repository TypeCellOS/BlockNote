import type { BlockNoteEditor } from "@blocknote/core";
import {
  findTypeInOtherYdoc,
  ForkYDocExtension,
  yXmlFragmentToBlocks,
} from "@blocknote/core/yjs";
import * as Y from "yjs";

import {
  type ChangeOperations,
  type ChangeResult,
  type ConflictError,
  type DocumentChange,
  dispatchOperations,
  type JSONChange,
  operationsOf,
  requireBase,
  type TextChange,
  type WriteFromVersion,
} from "../api.js";

/**
 * The version that the client read (`base`), and what merges the text with
 * the changes of other writers after that version (`merge`):
 *
 * - `"lens"` (the default): the target of the text for `base` merges
 *   three-way with the current document, by block ID (see `merge/tree.ts`),
 *   and the operations apply to the current document. A conflict keeps the
 *   current value, or with `onConflict: "reject"`, nothing applies.
 * - `"yjs"`: the operations for `base` apply to a fork of the Y.Doc at
 *   `base` (see `ForkYDocExtension`), and Yjs merges the fork into the
 *   Y.Doc. Yjs has no conflicts, thus `onConflict` is not allowed: Yjs keeps
 *   the inserts of the two writers, and a removal removes the changes of
 *   other writers in the removed block. With y-prosemirror v13, a move, a
 *   split and a join are a removal and an insert, and a change of the type
 *   replaces the content node of the block. Thus, if two writers move the
 *   same block, the block is there two times, and a change of another
 *   writer to a block that the text moves, splits, joins or changes the type
 *   of, can be lost. The layout blocks stay, also if they become empty: Yjs
 *   cannot merge the removal of a column with a block that another writer
 *   adds to it. A base without content uses `"lens"`: a fork of an empty
 *   document gets its own root block group, and Yjs cannot merge two new
 *   root structures into one.
 */
export type YDocWriteFromVersion =
  | (WriteFromVersion<Uint8Array> & { merge?: "lens" })
  | { base: Uint8Array; merge: "yjs"; onConflict?: undefined };

/**
 * The result of a write to a Y.Doc. On an error (also an exception), the
 * write does not change the Y.Doc. Only the updates of `base` that the Y.Doc
 * did not have yet apply (see `updateYDoc`).
 */
export type YDocChangeResult =
  | (ChangeOperations & {
      /** The Yjs update of the write. Send it to the other clients, if no provider does that. */
      update: Uint8Array;
    })
  | { error: "invalid-document" }
  | ConflictError;

/**
 * Writes a change (a text, or BlockNote JSON) back to a Y.Doc, through an
 * editor that is bound to the
 * fragment of the document (`withCollaboration` of `@blocknote/core/yjs`)
 * and mounted, as a client does it. y-prosemirror syncs the editor and the
 * Y.Doc in the editor view: thus, the editor must be mounted, for example on
 * an element that is not in the page. To read the text, use
 * `getDocumentText` on the same editor.
 *
 * Give the editor the schema and the extensions of the other clients (for
 * example comments). When an editor binds to a Y.Doc, y-prosemirror removes
 * the content that the schema of the editor cannot read.
 *
 * `base` is the version that the client read: `"current"`, or the Yjs state
 * `Y.encodeStateAsUpdate` at that version. With a Yjs state, the result
 * keeps the changes that other writers made after that version: the target
 * of the change merges with the current document (see
 * {@link YDocWriteFromVersion}). With `merge: "yjs"`, the operations of the
 * result are for `base`, else they are for the current document.
 */
export function updateYDoc(
  editor: BlockNoteEditor<any, any, any>,
  fragment: Y.XmlFragment,
  change: (TextChange | JSONChange) & YDocWriteFromVersion,
): YDocChangeResult {
  const { fork, ydoc } = boundYDoc(editor, fragment);
  requireBase(change.base);
  const base = change.base === "current" ? undefined : change.base;
  const before = Y.encodeStateVector(ydoc);
  if (base !== undefined) {
    // The client can read from a replica with an update that this Y.Doc does
    // not have yet. Then `base` is not an older version of this Y.Doc, and
    // the merge sees that update as removed. Yjs updates apply only one
    // time, thus `base` makes this Y.Doc a newer version of it. The update
    // of the result then contains that update too.
    Y.applyUpdate(ydoc, base);
  }
  const { write, yjs } = writeOfChange(editor, fragment, change, base);
  // With `merge: "yjs"`, the write goes to a fork of the Y.Doc at `base`,
  // and Yjs merges it. Else, it goes to a fork of the current Y.Doc.
  const update = writeInFork(fork, yjs ? base : undefined, () => {
    // With `merge: "yjs"`, the layout blocks stay (see `YDocWriteFromVersion`).
    const result = operationsOf(editor, write, editor.document, yjs);
    if (result.error === undefined) {
      dispatchOperations(editor, result.operations);
    }
    return result;
  });
  return update.error === undefined
    ? { ...update, update: Y.encodeStateAsUpdate(ydoc, before) }
    : update;
}

/** The part of the fork extension of core (`ForkYDocExtension`) that a write uses. */
type Fork = {
  fork(options?: { initialUpdate?: Uint8Array }): void;
  merge(options: { keepChanges: boolean }): void;
};

/**
 * The fork extension and the Y.Doc of an editor that is bound to
 * `fragment`. Throws if the editor is not bound and mounted, or if it shows
 * a fork: the write would go into that fork, and its merge would end the
 * fork of the app (for example a version preview).
 */
function boundYDoc(
  editor: BlockNoteEditor<any, any, any>,
  fragment: Y.XmlFragment,
): { fork: Fork; ydoc: Y.Doc } {
  const fork = editor.getExtension(ForkYDocExtension);
  const ydoc = fragment.doc;
  if (fork === undefined || editor.headless || ydoc === null) {
    throw new Error(
      "The editor must be bound to the fragment of a Y.Doc (withCollaboration), and mounted.",
    );
  }
  if (fork.store.state.isForked) {
    throw new Error(
      "The editor shows a fork of the Y.Doc (for example a version preview). End the fork first.",
    );
  }
  return { fork, ydoc };
}

/**
 * The change that the editor writes, and if Yjs merges it (see
 * {@link YDocWriteFromVersion}). Without changes of other writers after
 * `base`, there is no merge: the change is for the current document. A base
 * without content and a Y.Doc without content are the same empty document.
 */
function writeOfChange(
  editor: BlockNoteEditor<any, any, any>,
  fragment: Y.XmlFragment,
  change: (TextChange | JSONChange) & YDocWriteFromVersion,
  base: Uint8Array | undefined,
): { write: DocumentChange; yjs: boolean } {
  const input: TextChange | JSONChange =
    change.document === undefined
      ? { format: change.format, text: change.text }
      : { document: change.document };
  const baseFragment =
    base === undefined
      ? undefined
      : findTypeInOtherYdoc(fragment, docFromState(base));
  const yjs =
    change.merge === "yjs" &&
    baseFragment !== undefined &&
    baseFragment.length > 0;
  const unchanged =
    baseFragment === undefined ||
    (baseFragment.length === 0 && fragment.length === 0);
  return {
    write:
      yjs || unchanged
        ? { ...input, base: "current" }
        : {
            ...input,
            base: yXmlFragmentToBlocks(editor, baseFragment),
            onConflict: change.onConflict,
          },
    yjs,
  };
}

/**
 * Runs the write in a fork of the Y.Doc, and keeps its changes only if it
 * gives no error. Thus, a write that fails (an error, or an exception in
 * the middle) does not change the Y.Doc.
 */
function writeInFork(
  fork: Fork,
  initialUpdate: Uint8Array | undefined,
  write: () => ChangeResult,
): ChangeResult {
  let result: ChangeResult | undefined;
  fork.fork({ initialUpdate });
  try {
    result = write();
  } finally {
    fork.merge({
      keepChanges: result !== undefined && result.error === undefined,
    });
  }
  return result;
}

function docFromState(state: Uint8Array): Y.Doc {
  const ydoc = new Y.Doc();
  Y.applyUpdate(ydoc, state);
  return ydoc;
}
