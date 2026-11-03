import type { BlockNoteEditor } from "@blocknote/core";
import {
  findTypeInOtherYdoc,
  ForkYDocExtension,
  yXmlFragmentToBlocks,
} from "@blocknote/core/yjs";
import * as Y from "yjs";

import {
  computeBlocksUpdate,
  type TextUpdate,
  type TextUpdateOptions,
  type ValidTextUpdate,
  write,
} from "../api.js";

/**
 * How a write merges the text with the changes of other writers after `base`:
 *
 * - `"rebase"`: the lens merges the text with the current document (a
 *   three-way merge of the block trees, see `merge/tree.ts`), and the editor
 *   applies the result.
 * - `"yjs"`: the editor applies the changes of the text to a fork of the
 *   Y.Doc at `base` (see `ForkYDocExtension`), and Yjs merges the fork into
 *   the Y.Doc. In the Yjs binding now, a move is a removal and an insert.
 *   Thus, if another writer changes a block that the text moves, the change
 *   is lost, and if two writers move the same block, the block is there two
 *   times, with the same ID in the Y.Doc. Yjs does not know the schema. As in
 *   each client, y-prosemirror removes the content of a merged document that
 *   does not fit the schema. A flat document model in the binding will remove
 *   these problems.
 */
export type MergeStrategy = "rebase" | "yjs";

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
  | { error: "invalid-document" };

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
 * The text can come from an older version of the document (`base`). The
 * result keeps the changes that other writers made after that version.
 * `strategy` selects how (the default is "rebase"). With the "yjs" strategy,
 * the operations of the result are for `base`. With the "rebase" strategy,
 * they are for the current document. A write from an empty base always uses
 * the "rebase" strategy: a fork of an empty document gets its own root block
 * group, and Yjs cannot merge two new root structures into one.
 */
export function updateYDocFromText(
  editor: BlockNoteEditor<any, any, any>,
  fragment: Y.XmlFragment,
  options: Omit<TextUpdateOptions, "base"> & {
    /** The Yjs state (`Y.encodeStateAsUpdate`) at the version that the client read. Without `base`, the text applies to the current document. */
    base?: Uint8Array;
    strategy?: MergeStrategy;
  },
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
  const { base, strategy = "rebase", ...textOptions } = options;
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

  let update: TextUpdate | undefined;
  if (
    strategy === "yjs" &&
    baseFragment !== undefined &&
    baseFragment.length > 0
  ) {
    fork.fork({ initialUpdate: base });
    try {
      // The layout blocks stay, also if they become empty: Yjs cannot merge
      // the removal of a column with a block that another writer adds to it.
      update = writeThroughBinding(editor, {
        ...textOptions,
        keepLayout: true,
      });
    } finally {
      fork.merge({
        keepChanges: update !== undefined && update.error === undefined,
      });
    }
  } else {
    // A base without content and a Y.Doc without content are the same empty
    // document: no other writer changed it.
    const unchanged =
      baseFragment === undefined ||
      (baseFragment.length === 0 && fragment.length === 0);
    // The write goes to a fork of the current Y.Doc. Thus, a write that
    // fails in the middle does not change the Y.Doc.
    fork.fork();
    try {
      update = writeThroughBinding(editor, {
        ...textOptions,
        base: unchanged
          ? undefined
          : yXmlFragmentToBlocks(editor, baseFragment),
      });
    } finally {
      fork.merge({
        keepChanges: update !== undefined && update.error === undefined,
      });
    }
  }
  return update.error === undefined
    ? { ...update, update: Y.encodeStateAsUpdate(ydoc, before) }
    : update;
}

/** Computes the update for the document of the editor, and dispatches its steps (see `dispatchUpdate`). */
function writeThroughBinding(
  editor: BlockNoteEditor<any, any, any>,
  options: Omit<Parameters<typeof computeBlocksUpdate>[1], "current">,
): TextUpdate {
  return write(editor, (current) =>
    computeBlocksUpdate(editor, { ...options, current }),
  );
}

function docFromState(state: Uint8Array): Y.Doc {
  const ydoc = new Y.Doc();
  Y.applyUpdate(ydoc, state);
  return ydoc;
}
