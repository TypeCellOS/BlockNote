import type { BlockNoteEditor } from "@blocknote/core";
import {
  findTypeInOtherYdoc,
  ForkYDocExtension,
  yXmlFragmentToBlocks,
} from "@blocknote/core/yjs";
import * as Y from "yjs";

import {
  type ChangeOperations,
  changesAfterBase,
  dispatchOperations,
  type DocumentChangedError,
  type InvalidDocumentError,
  type JSONChange,
  operationsOf,
  requireBase,
  type TextChange,
  type WriteFromVersion,
} from "../api.js";
import type { LensBlock } from "../model.js";

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
  | InvalidDocumentError
  | DocumentChangedError;

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
 * `Y.encodeStateAsUpdate` at that version. The write is strict, as
 * `updateDocument`: with a Yjs state, it applies only if the document of
 * the fragment is still at that version. If other writers changed it after
 * `base`, the result is the error `"document-changed"`, with the blocks that
 * they changed. The check compares the blocks of the fragment at `base`
 * with the current blocks, not the state vectors: a state vector also
 * changes for a change in a different fragment of the Y.Doc. To merge the
 * change with the changes of other writers, use `updateYDocWithMerge`.
 */
export function updateYDoc(
  editor: BlockNoteEditor<any, any, any>,
  fragment: Y.XmlFragment,
  change: (TextChange | JSONChange) & WriteFromVersion<Uint8Array>,
): YDocChangeResult {
  const { fork, ydoc } = boundYDoc(editor, fragment);
  requireBase(change.base);
  const before = Y.encodeStateVector(ydoc);
  if (change.base !== "current") {
    const base = applyBase(editor, ydoc, fragment, change.base);
    // The check comes before the fork: a write that does not apply costs
    // one diff of the documents.
    const changesOfOthers =
      base.content === "none-as-now"
        ? []
        : changesAfterBase(base.blocks, editor.document);
    if (changesOfOthers.length > 0) {
      return { error: "document-changed", changesOfOthers };
    }
  }
  const result = writeInFork(fork, undefined, () =>
    writeToEditor(editor, change, false),
  );
  return result.error !== undefined
    ? result
    : { ...result, update: Y.encodeStateAsUpdate(ydoc, before) };
}

/**
 * The part of the fork extension of core (`ForkYDocExtension`) that a write
 * uses.
 *
 * @internal
 */
export type Fork = {
  fork(options?: { initialUpdate?: Uint8Array }): void;
  merge(options: { keepChanges: boolean }): void;
};

/**
 * The fork extension and the Y.Doc of an editor that is bound to
 * `fragment`. Throws if the editor is not bound and mounted, or if it shows
 * a fork: the write would go into that fork, and its merge would end the
 * fork of the app (for example a version preview).
 *
 * @internal
 */
export function boundYDoc(
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
 * The document of the fragment at the version `base` of a write.
 *
 * @internal
 */
export type BaseDocument =
  /**
   * The fragment has no content at `base`, and no content now. These are
   * the same empty document: the editor shows one empty block for it, which
   * is not in the Y.Doc.
   */
  | { content: "none-as-now" }
  /** The fragment has no content at `base`, and it has content now. */
  | { content: "none"; blocks: LensBlock[] }
  | { content: "blocks"; blocks: LensBlock[] };

/**
 * Makes the Y.Doc a newer version of `base` (the Yjs state of the version
 * that the client read), and returns the document of the fragment at
 * `base`.
 *
 * The client can read from a replica with an update that this Y.Doc does
 * not have yet. Then `base` is not an older version of this Y.Doc, and a
 * compare or a merge with the current document sees that update as removed.
 * Yjs updates apply only one time, thus `base` makes this Y.Doc a newer
 * version of it. The update of the result then contains that update too.
 *
 * @internal
 */
export function applyBase(
  editor: BlockNoteEditor<any, any, any>,
  ydoc: Y.Doc,
  fragment: Y.XmlFragment,
  base: Uint8Array,
): BaseDocument {
  Y.applyUpdate(ydoc, base);
  const version = new Y.Doc();
  Y.applyUpdate(version, base);
  const baseFragment = findTypeInOtherYdoc(fragment, version);
  if (baseFragment.length > 0) {
    return {
      content: "blocks",
      blocks: yXmlFragmentToBlocks(editor, baseFragment),
    };
  }
  return fragment.length === 0
    ? { content: "none-as-now" }
    : { content: "none", blocks: yXmlFragmentToBlocks(editor, baseFragment) };
}

/**
 * Runs the write in a fork of the Y.Doc, and keeps its changes only if it
 * gives no error. Thus, a write that fails (an error, or an exception in
 * the middle) does not change the Y.Doc. The fork starts at the current
 * Y.Doc, or at the Yjs state `initialUpdate`.
 *
 * @internal
 */
export function writeInFork<Result extends { error?: string }>(
  fork: Fork,
  initialUpdate: Uint8Array | undefined,
  write: () => Result,
): Result {
  let result: Result | undefined;
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

/**
 * Computes the operations of the change for the document of the editor,
 * without a merge, and applies them to the editor. With `keepLayout`, the
 * layout blocks stay, also if they become empty (see `fitResult`).
 *
 * @internal
 */
export function writeToEditor(
  editor: BlockNoteEditor<any, any, any>,
  change: TextChange | JSONChange,
  keepLayout: boolean,
): ChangeOperations | InvalidDocumentError {
  const result = operationsOf(editor, change, editor.document, keepLayout);
  if (result.error === undefined) {
    dispatchOperations(editor, result.operations);
  }
  return result;
}
