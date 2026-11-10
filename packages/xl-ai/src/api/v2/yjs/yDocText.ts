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
  type JSONChange,
  operationsOf,
  requireBase,
  type TextChange,
  write,
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
// eslint-disable-next-line complexity -- Follow-up: move the checks of the binding to a function.
export function updateYDoc(
  editor: BlockNoteEditor<any, any, any>,
  fragment: Y.XmlFragment,
  change: (TextChange | JSONChange) & YDocWriteFromVersion,
): YDocChangeResult {
  const fork = editor.getExtension(ForkYDocExtension);
  const ydoc = fragment.doc;
  if (fork === undefined || editor.headless || ydoc === null) {
    throw new Error(
      "The editor must be bound to the fragment of a Y.Doc (withCollaboration), and mounted.",
    );
  }
  if (fork.store.state.isForked) {
    // The write would go into that fork, and its merge would end the fork of
    // the app (for example a version preview).
    throw new Error(
      "The editor shows a fork of the Y.Doc (for example a version preview). End the fork first.",
    );
  }
  requireBase(change.base);
  const { onConflict, merge } = change;
  const input: TextChange | JSONChange =
    change.document === undefined
      ? { format: change.format, text: change.text }
      : { document: change.document };
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
  const baseFragment =
    base === undefined
      ? undefined
      : findTypeInOtherYdoc(fragment, docFromState(base));

  // With `merge: "yjs"`, the write goes to a fork of the Y.Doc at `base`,
  // and Yjs merges it. Else, it goes to a fork of the current Y.Doc. Thus,
  // a write that fails in the middle does not change the Y.Doc.
  const yjs =
    merge === "yjs" && baseFragment !== undefined && baseFragment.length > 0;
  // A base without content and a Y.Doc without content are the same empty
  // document: no other writer changed it.
  const unchanged =
    baseFragment === undefined ||
    (baseFragment.length === 0 && fragment.length === 0);
  let update: ChangeResult | undefined;
  fork.fork({ initialUpdate: yjs ? base : undefined });
  try {
    // Without changes of other writers, there is no conflict.
    const writeChange: DocumentChange =
      yjs || unchanged
        ? { ...input, base: "current" }
        : {
            ...input,
            base: yXmlFragmentToBlocks(editor, baseFragment),
            onConflict,
          };
    // With `merge: "yjs"`, the layout blocks stay (see `YDocWriteFromVersion`).
    update = write(editor, (current) =>
      operationsOf(editor, writeChange, current, yjs),
    );
  } finally {
    fork.merge({
      keepChanges: update !== undefined && update.error === undefined,
    });
  }
  return update.error === undefined
    ? { ...update, update: Y.encodeStateAsUpdate(ydoc, before) }
    : update;
}

function docFromState(state: Uint8Array): Y.Doc {
  const ydoc = new Y.Doc();
  Y.applyUpdate(ydoc, state);
  return ydoc;
}
