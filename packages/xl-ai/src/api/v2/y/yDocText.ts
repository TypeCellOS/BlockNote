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
  type ChangeOfOthers,
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

/**
 * The result of a write to a Y.Doc. With an error, the Y.Doc gets only the
 * updates of `base` that it did not have yet.
 */
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
 * format of the versions of core). Yjs throws for a V1 update. The write
 * first applies `base` to the Y.Doc, because the client can read from a
 * replica with an update that this Y.Doc does not have yet.
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
  if (change.base !== "current") {
    const atBase = fragmentAtBase(fragment, change.base);
    Y.applyUpdateV2(ydoc, change.base);
    const changesOfOthers = fragmentChangesAfterBase(editor, atBase, fragment);
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
 * The blocks that other writers changed in the fragment after `base`.
 * `atBase` is the fragment at `base`, in a temporary Y.Doc. The check
 * compares content, not state vectors: a state vector also changes for a
 * change in a different fragment, and for a change that a later change
 * reverts.
 */
function fragmentChangesAfterBase(
  editor: BlockNoteEditor<any, any, any>,
  atBase: Y.Node,
  fragment: Y.Node,
): ChangeOfOthers[] {
  // Usually, the content is equal, and Yjs compares it without a conversion
  // to blocks. `renderer: null`: see `applyTransactionToYjsFragment`.
  if (atBase.toDeltaDeep().equals(fragment.toDeltaDeep({ renderer: null }))) {
    return [];
  }
  // Content that is not equal can be the same blocks: for example, an empty
  // block group can stay in the fragment. Thus, the blocks decide.
  return changesAfterBase(
    yfragmentToBlocks(editor, atBase),
    yfragmentToBlocks(editor, fragment),
  );
}

/**
 * Changes the ProseMirror document of the fragment of a Y.Doc, and writes
 * the difference to the fragment, in one Yjs transaction. `change` adds its
 * steps to a transaction, as the callback of `editor.transact` does. The
 * function needs no editor.
 *
 * The document is the one that the binding of an editor shows for the
 * fragment: the same pipeline (`blockNoteTransformer` of core) maps the
 * fragment to the document, and the difference back to the fragment. The
 * difference is `docDiffToDelta` of core, which pairs two blocks only if
 * they have the same block ID.
 */
function applyTransactionToYjsFragment(
  schema: Schema,
  fragment: Y.Node,
  change: (tr: Transaction) => void,
): void {
  // `renderer: null`: the content as it is, not as a renderer of a bound
  // editor shows it (for example with suggestions).
  const render = fragment.toDeltaDeep({ renderer: null });
  const pipeline = blockNoteTransformer({ getState: () => render, schema })(
    $prosemirrorDelta,
  ).init();
  // The pipeline changes the delta that it gets. Thus, it gets a copy.
  const shown = pipeline.applyA(delta.cloneDeep(render)).b ?? render;
  // For a fragment without blocks, the binding shows an empty paragraph that
  // the fragment does not have (the fill of the schema). Thus, the document
  // is a root block group without blocks.
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
  // makes the root block group.
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
