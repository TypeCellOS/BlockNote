import type { BlockNoteEditor } from "@blocknote/core";
import {
  findTypeInOtherYdoc,
  ForkYDocExtension,
  yXmlFragmentToBlocks,
} from "@blocknote/core/yjs";
import * as Y from "yjs";

import {
  type ConflictError,
  type TextUpdate,
  type ValidTextUpdate,
  updateDocumentFromText,
  type WriteFromVersion,
} from "../api.js";
import type { TextFormat } from "../formats/types.js";

/**
 * The result of a write to a Y.Doc. On an error (also an exception), the
 * write does not change the Y.Doc. Only the updates of `base` that the Y.Doc
 * did not have yet apply (see `updateYDocFromText`).
 */
export type YDocTextUpdate =
  | (ValidTextUpdate & {
      /** The Yjs update of the write. Send it to the other clients, if no provider does that. */
      update: Uint8Array;
    })
  | { error: "invalid-document" }
  | ConflictError;

/**
 * Writes text back to a Y.Doc, through an editor that is bound to the
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
 * The text can come from an older version of the document (`base`, the Yjs
 * state `Y.encodeStateAsUpdate` at the version that the client read). The
 * result keeps the changes that other writers made after that version: the
 * target of the text merges three-way with the current document (see
 * `merge/tree.ts`), and the operations are for the current document.
 */
export function updateYDocFromText(
  editor: BlockNoteEditor<any, any, any>,
  fragment: Y.XmlFragment,
  options: {
    format: TextFormat;
    /** A text from `getDocumentText`, possibly with changes. */
    text: string;
  } & WriteFromVersion<Uint8Array>,
): YDocTextUpdate {
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
  const { base, onConflict, ...textOptions } = options;
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

  // A base without content and a Y.Doc without content are the same empty
  // document: no other writer changed it.
  const unchanged =
    baseFragment === undefined ||
    (baseFragment.length === 0 && fragment.length === 0);
  let update: TextUpdate | undefined;
  // The write goes to a fork of the Y.Doc. Thus, a write that fails in the
  // middle does not change the Y.Doc.
  fork.fork();
  try {
    // Without changes of other writers, there is no conflict.
    update = updateDocumentFromText(
      editor,
      unchanged
        ? textOptions
        : {
            ...textOptions,
            base: yXmlFragmentToBlocks(editor, baseFragment),
            onConflict,
          },
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
