import type { BlockNoteEditor } from "@blocknote/core";
import {
  blockNoteTransformer,
  docDiffToDelta,
  findTypeInOtherYdoc,
  yfragmentToBlocks,
} from "@blocknote/core/y";
import { $prosemirrorDelta, deltaToPNode, pmnodeToDelta } from "@y/prosemirror";
import * as Y from "@y/y";
import * as delta from "lib0/delta";
import type { Schema } from "prosemirror-model";
import { EditorState, type Transaction } from "prosemirror-state";

import {
  type ChangeOperations,
  changesAfterBase,
  type DocumentChangedError,
  type InvalidDocumentError,
  type JSONChange,
  operationsOf,
  requireBase,
  type TextChange,
  type WriteFromVersion,
} from "../api.js";
import type { TextFormat } from "../formats/index.js";
import { applyOperations, type BlockOperation } from "../operations/index.js";

/**
 * Returns the document of the fragment of a Y.Doc in the format. A client
 * reads this text, changes it, and writes it back with `updateYDoc`. The
 * editor gives the schema and the conversions of the format (see
 * `updateYDoc`).
 */
export function getYDocText(
  editor: BlockNoteEditor<any, any, any>,
  fragment: Y.Node,
  format: TextFormat,
): string {
  return format.serialize(editor, yfragmentToBlocks(editor, fragment));
}

/**
 * The result of a write to a Y.Doc. With an error in the result, the write
 * did not change the Y.Doc: only the updates of `base` that the Y.Doc did
 * not have yet apply. For an exception, see `updateYDoc`.
 */
export type YDocChangeResult =
  | (ChangeOperations & {
      /**
       * The Yjs update of the write, in the V2 format: apply it with
       * `Y.applyUpdateV2`. Send it to the other clients, if no provider does
       * that. The name has the format, because `Y.applyUpdate` (V1) does not
       * throw for a V2 update: it gives a Y.Doc without the write.
       */
      updateV2: Uint8Array;
    })
  | InvalidDocumentError
  | DocumentChangedError;

/**
 * Writes a change (a text, or BlockNote JSON) back to the fragment of a
 * Y.Doc of Yjs 14 (`@y/y`). To read the text, use `getYDocText`.
 *
 * Use this function for each writer that is not the user of an editor that
 * is bound to the Y.Doc: a server, an agent, an import. The write is not a
 * change of the user of an editor: the undo of an editor does not revert
 * it. For a write of the user of a bound editor, use `updateDocument`
 * on that editor (see the README, "Which function to use").
 *
 * The editor gives only the schema and the conversions of the formats. It
 * does not have to be bound to the Y.Doc, and it needs no view. The reason:
 * with Yjs 14, a ProseMirror document maps to a Y.Doc, and a Y.Doc to a
 * ProseMirror document, with functions of `@y/prosemirror` and
 * `@blocknote/core/y`, through the same pipeline as the binding of an
 * editor. Thus, the write does not go through an editor view. An editor that
 * is bound to the Y.Doc gets the write as a change of another writer.
 *
 * Give the editor the schema and the extensions of the other clients (for
 * example comments). If the schema cannot read the content of the fragment,
 * the read of the fragment throws (in `@y/prosemirror`), and the Y.Doc does
 * not change.
 *
 * `base` is the version that the client read: `"current"`, or the Yjs state
 * at that version as a V2 update (`Y.encodeStateAsUpdateV2(ydoc)`). This is
 * the format of the versions of core, thus a stored version of core is a
 * valid `base`. A V1 update (`Y.encodeStateAsUpdate`) is not a valid `base`:
 * Yjs throws for it when it decodes the update, and the Y.Doc does not
 * change. The format has no mark that a check can read, thus the write has
 * no check of its own.
 *
 * The write first applies `base` to the Y.Doc. The reason: the client can
 * read from a replica with an update that this Y.Doc does not have yet. Then
 * `base` is not an older version of this Y.Doc, and a compare or a merge
 * with the current document sees that update as removed. Yjs applies an
 * update only one time, thus the Y.Doc gets only the updates that it did not
 * have. The update of the result contains them.
 *
 * The write is strict, as `updateDocument`: with a Yjs state, it applies
 * only if the document of the fragment is still at that version. If other
 * writers changed it after `base`, the result is the error
 * `"document-changed"`, with the blocks that they changed. The check
 * compares the content of the fragment at `base` with the current content,
 * not the state vectors: a state vector also changes for a change in a
 * different fragment of the Y.Doc, and for a change that a later change
 * reverts. To merge the change with the changes of other writers, use
 * `updateYDocWithMerge`.
 *
 * The write is one call of Yjs: one Yjs transaction, with the client ID of
 * the Y.Doc. The lens reads, checks and computes before that call. Thus,
 * with an error in the result, or an exception before that call (for
 * example for a schema that cannot read the fragment), the write does not
 * change the Y.Doc. Yjs cannot revert a transaction. Thus, if Yjs throws in
 * that call, a part of the write can stay in the Y.Doc. A text or a
 * document of a client does not cause such an exception: it shows a fault
 * in the lens, in core or in Yjs. An exception of an observer of the Y.Doc
 * (for example a provider) comes after the transaction: then the Y.Doc has
 * the complete write.
 */
export function updateYDoc(
  editor: BlockNoteEditor<any, any, any>,
  fragment: Y.Node,
  change: (TextChange | JSONChange) & WriteFromVersion<Uint8Array>,
): YDocChangeResult {
  const ydoc = docOf(fragment);
  requireBase(change.base);
  const before = Y.encodeStateVector(ydoc);
  if (change.base !== "current") {
    const atBase = fragmentAtBase(fragment, change.base);
    Y.applyUpdateV2(ydoc, change.base);
    // Usually, the content is equal, and Yjs compares the content of two
    // fragments without a conversion to blocks. Content that is not equal
    // can be the same blocks: for example, a block group that became empty
    // can stay in the fragment. Thus, the blocks decide.
    //
    // `renderer: null` gives the content as it is. An editor that is bound
    // to the fragment can give it a renderer, which shows different content
    // (for example an older version).
    const changesOfOthers = atBase
      .toDeltaDeep()
      .equals(fragment.toDeltaDeep({ renderer: null }))
      ? []
      : changesAfterBase(
          yfragmentToBlocks(editor, atBase),
          yfragmentToBlocks(editor, fragment),
        );
    if (changesOfOthers.length > 0) {
      return { error: "document-changed", changesOfOthers };
    }
  }
  const current = yfragmentToBlocks(editor, fragment);
  const result = operationsOf(editor, change, current);
  if (result.error !== undefined) {
    return result;
  }
  writeOperations(editor, fragment, result.operations);
  return { ...result, updateV2: Y.encodeStateAsUpdateV2(ydoc, before) };
}

/**
 * The Y.Doc of the fragment. Throws for a fragment that is not in a Y.Doc.
 *
 * @internal
 */
export function docOf(fragment: Y.Node): Y.Doc {
  if (fragment.doc === null) {
    throw new Error("The fragment must be in a Y.Doc.");
  }
  return fragment.doc;
}

/**
 * The fragment at `base` (the Yjs state of the version that the client read,
 * as a V2 update), in a temporary Y.Doc.
 *
 * @internal
 */
export function fragmentAtBase(fragment: Y.Node, base: Uint8Array): Y.Node {
  const version = new Y.Doc();
  Y.applyUpdateV2(version, base);
  return findTypeInOtherYdoc(fragment, version);
}

/**
 * Writes the operations of a write to the fragment, with one call of Yjs
 * (one Yjs transaction).
 *
 * @internal
 */
export function writeOperations(
  editor: BlockNoteEditor<any, any, any>,
  fragment: Y.Node,
  operations: readonly BlockOperation[],
): void {
  applyTransactionToYjsFragment(editor.pmSchema, fragment, (tr) =>
    applyOperations(tr, operations),
  );
}

/**
 * Changes the ProseMirror document of the fragment of a Y.Doc with a
 * transaction, and writes the change to the fragment, in one Yjs
 * transaction. `change` gets the transaction and adds its steps, as the
 * callback of `editor.transact` does. The function needs no editor: the
 * transaction is of a state without plugins.
 *
 * The document is the ProseMirror document that the binding of an editor
 * shows for the fragment. The pipeline of the binding (`blockNoteTransformer`
 * of core) maps the content of the fragment to that document, and a change
 * of the document back to a change of the fragment. For example, the
 * fragment keeps the empty block groups, and the document does not have
 * them.
 *
 * The change is the difference of the document before and after the
 * transaction: `docDiffToDelta` of core, which pairs two blocks only if they
 * have the same block ID. Thus, one difference for a write is correct, also
 * with an insert or a removal next to a changed block.
 *
 * A fragment without blocks is the one special case. For such a fragment,
 * the binding shows one empty paragraph, which the fragment does not have
 * (the fill of the schema, with a new ID for each read). Thus, the document
 * of the transaction is a root block group without blocks, and `change` sees
 * a document without blocks. Such a fragment has one of two forms:
 *
 * - No content (a new Y.Doc): the write is the complete document, and it
 *   makes the root block group.
 * - A root block group without blocks (`blocksToYDoc(editor, [])` of the
 *   versions 0.52 to 0.55 wrote this): the write is the difference, as for
 *   a fragment with blocks.
 *
 * The read and the write of the fragment have `renderer: null`: the content
 * as it is. An editor that is bound to the fragment can give it a renderer
 * (for example for suggestions), which shows different content.
 */
function applyTransactionToYjsFragment(
  schema: Schema,
  fragment: Y.Node,
  change: (tr: Transaction) => void,
): void {
  const render = fragment.toDeltaDeep({ renderer: null });
  const pipeline = blockNoteTransformer({ getState: () => render, schema })(
    $prosemirrorDelta,
  ).init();
  // The pipeline changes the delta that it gets. Thus, it gets a copy, as in
  // the binding (`lib0/delta/rdt`).
  const shown = pipeline.applyA(delta.cloneDeep(render)).b ?? render;
  const doc = hasBlocks(fragment)
    ? deltaToPNode(shown, schema, null)
    : schema.topNodeType.create(null, schema.nodes["blockGroup"].create());
  // A state without plugins: the steps give a complete document (a block
  // that the fill of the schema adds gets its ID in the step).
  const tr = EditorState.create({ doc }).tr;
  change(tr);
  if (!tr.docChanged) {
    return;
  }
  const yChange =
    fragment.length === 0
      ? pmnodeToDelta(tr.doc, { transformer: blockNoteTransformer })
      : pipeline.applyB(delta.cloneDeep(docDiffToDelta(doc, tr.doc))).a;
  if (yChange !== null) {
    fragment.applyDelta(yChange, null, { renderer: null });
  }
}

/**
 * True if the fragment has a block: it has a root block group, and that
 * group has a child.
 */
function hasBlocks(fragment: Y.Node): boolean {
  const rootGroup: unknown =
    fragment.length === 0 ? undefined : fragment.get(0);
  return rootGroup instanceof Y.Node && rootGroup.length > 0;
}
