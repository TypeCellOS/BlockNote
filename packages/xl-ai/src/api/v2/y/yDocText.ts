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
 * reads this text, changes it, and writes it back with `updateYDoc`.
 */
export function getYDocText(
  editor: BlockNoteEditor<any, any, any>,
  fragment: Y.Node,
  format: TextFormat,
): string {
  return format.serialize(editor, yfragmentToBlocks(editor, fragment));
}

/** The result of a write to a Y.Doc. With an error, the Y.Doc does not change. */
export type YDocChangeResult =
  | (ChangeOperations & {
      /**
       * The Yjs update of the write, as a V2 update. Send it to the other
       * clients, if no provider does that. Apply it with `Y.applyUpdateV2`:
       * `Y.applyUpdate` (V1) does not throw for a V2 update, and gives a
       * Y.Doc without the write.
       */
      updateV2: Uint8Array;
    })
  | InvalidDocumentError
  | DocumentChangedError;

/**
 * Writes a change (a text, or BlockNote JSON) to the fragment of a Y.Doc of
 * Yjs 14 (`@y/y`). Use it for a writer that is not the user of a bound
 * editor: a server, an agent, an import (see the README, "Which function to
 * use"). The undo of an editor does not revert the write.
 *
 * The editor gives only the schema and the conversions of the formats: it
 * does not have to be bound to the Y.Doc, and it needs no view. Give it the
 * schema and the extensions of the other clients. If the schema cannot read
 * the fragment, the read throws, and the Y.Doc does not change.
 *
 * `base` is the version that the client read: `"current"`, or the Yjs state
 * at that version as a V2 update (`Y.encodeStateAsUpdateV2(ydoc)`, also the
 * format of the versions of core). Yjs throws for a V1 update. The client
 * can read from a replica with an update that this Y.Doc does not have yet:
 * a write that applies also gives the Y.Doc the updates of `base` that it
 * does not have.
 *
 * The write is strict, as `updateDocument`: if other writers changed the
 * document of the fragment after `base`, the result is the error
 * `"document-changed"`. To merge with their changes, use
 * `updateYDocWithMerge`.
 *
 * The write is one Yjs transaction. With an error in the result, or an
 * exception before the transaction, the Y.Doc does not change. Yjs cannot
 * revert a transaction: if Yjs throws in it, a part of the write can stay
 * (see the README, "Pipeline", step 8).
 */
export function updateYDoc(
  editor: BlockNoteEditor<any, any, any>,
  fragment: Y.Node,
  change: (TextChange | JSONChange) & WriteFromVersion<Uint8Array>,
): YDocChangeResult {
  const ydoc = docOf(fragment);
  requireBase(change.base);
  const before = Y.encodeStateVector(ydoc);
  const result = strictOperationsOf(editor, fragment, change);
  if (result.error !== undefined) {
    return result;
  }
  // The Y.Doc changes only from here: it gets the updates of `base` that it
  // does not have, and then the write.
  if (change.base !== "current") {
    Y.applyUpdateV2(ydoc, change.base);
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
 * The fragment as it is after the Y.Doc gets `base`, in a temporary Y.Doc.
 * The Y.Doc does not change. A write computes with this fragment. Thus, a
 * write that fails leaves the Y.Doc as it is.
 *
 * @internal
 */
export function fragmentWithBase(fragment: Y.Node, base: Uint8Array): Y.Node {
  const withBase = fragmentAtBase(fragment, base);
  const temporary = docOf(withBase);
  // The temporary Y.Doc has `base`. It gets the updates of the Y.Doc that
  // `base` does not have.
  Y.applyUpdateV2(
    temporary,
    Y.encodeStateAsUpdateV2(docOf(fragment), Y.encodeStateVector(temporary)),
  );
  return withBase;
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
 * The operations of a strict write to the fragment, or the error of the
 * write. Does not change the Y.Doc.
 */
function strictOperationsOf(
  editor: BlockNoteEditor<any, any, any>,
  fragment: Y.Node,
  change: (TextChange | JSONChange) & WriteFromVersion<Uint8Array>,
): ChangeOperations | InvalidDocumentError | DocumentChangedError {
  if (change.base === "current") {
    return operationsOf(editor, change, yfragmentToBlocks(editor, fragment));
  }
  // The write sees the fragment as it is after the Y.Doc gets `base`.
  const withBase = fragmentWithBase(fragment, change.base);
  const changesOfOthers = fragmentChangesAfterBase(
    editor,
    fragmentAtBase(fragment, change.base),
    withBase,
  );
  if (changesOfOthers.length > 0) {
    return { error: "document-changed", changesOfOthers };
  }
  return operationsOf(editor, change, yfragmentToBlocks(editor, withBase));
}

/**
 * The changes of other writers to the fragment after `base`, as operations.
 * `atBase` is the fragment at `base`, and `withBase` is the fragment as it
 * is after the Y.Doc gets `base` (see `fragmentWithBase`).
 */
function fragmentChangesAfterBase(
  editor: BlockNoteEditor<any, any, any>,
  atBase: Y.Node,
  withBase: Y.Node,
): BlockOperation[] {
  // The check compares content, not state vectors: a state vector also
  // changes for a change in a different fragment, and for a change that a
  // later change reverts.
  //
  // Usually, the content is equal, and Yjs compares it without a conversion
  // to blocks.
  if (atBase.toDeltaDeep().equals(withBase.toDeltaDeep())) {
    return [];
  }
  // Content that is not equal can be the same blocks: for example, an empty
  // block group can stay in the fragment. Thus, the blocks decide.
  return changesAfterBase(
    yfragmentToBlocks(editor, atBase),
    yfragmentToBlocks(editor, withBase),
  );
}

/**
 * Changes the ProseMirror document of the fragment of a Y.Doc, and writes
 * the difference to the fragment, in one Yjs transaction. The function
 * needs no editor.
 *
 * `change` adds its steps to a transaction, as the callback of
 * `editor.transact` does. The document of the transaction is the one that
 * the binding of an editor shows for the fragment, with one exception: for
 * a fragment without blocks, it is a document without blocks (the binding
 * shows an empty paragraph).
 *
 * In the difference, two blocks are the same block only if they have the
 * same block ID. Thus, a change of another writer stays in its block.
 */
function applyTransactionToYjsFragment(
  schema: Schema,
  fragment: Y.Node,
  change: (tr: Transaction) => void,
): void {
  // `renderer: null`: the content as it is, not as a renderer of a bound
  // editor shows it (for example with suggestions).
  const render = fragment.toDeltaDeep({ renderer: null });
  // The pipeline of the binding maps the content of the fragment to the
  // document, and a change of the document back to a change of the fragment.
  const pipeline = blockNoteTransformer({ getState: () => render, schema })(
    $prosemirrorDelta,
  ).init();
  // The pipeline changes the delta that it gets. Thus, it gets a copy.
  const shown = pipeline.applyA(delta.cloneDeep(render)).b ?? render;
  // The empty paragraph that the binding shows for a fragment without blocks
  // is the fill of the schema: the fragment does not have it. Thus, the
  // document is a root block group without blocks.
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
  // A fragment without content gets the complete document: the first write
  // makes the root block group. Else, the write is the difference
  // (`docDiffToDelta` of core pairs two blocks by their ID).
  const yChange =
    fragment.length === 0
      ? pmnodeToDelta(tr.doc, { transformer: blockNoteTransformer })
      : pipeline.applyB(delta.cloneDeep(docDiffToDelta(doc, tr.doc))).a;
  if (yChange !== null) {
    fragment.applyDelta(yChange, null, { renderer: null });
  }
}

/**
 * True if the fragment has a block. A fragment without blocks has no
 * content, or it has a root block group without blocks
 * (`blocksToYDoc(editor, [])` of the versions 0.52 to 0.55 wrote that).
 */
function hasBlocks(fragment: Y.Node): boolean {
  const rootGroup: unknown =
    fragment.length === 0 ? undefined : fragment.get(0);
  return rootGroup instanceof Y.Node && rootGroup.length > 0;
}
