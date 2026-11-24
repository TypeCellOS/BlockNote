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
  type ChangeResult,
  type InvalidDocumentError,
  type JSONChange,
  operationsOf,
  type TextChange,
} from "../api.js";
import type { TextFormat } from "../formats/index.js";
import {
  applyOperations,
  type BlockOperation,
  diffDocuments,
} from "../operations/index.js";
import { assertBlockIds } from "../util/blocks/index.js";

// The text lens for a Y.Doc of Yjs 14. How a write relates to the merge of
// Yjs:
//
// - Each write is one Yjs transaction on the Y.Doc of the caller, and its
//   result has the Yjs update (`updateV2`). The other replicas merge that
//   update at their sync, as they merge each update. No function here
//   controls that merge.
// - `base` (the version that a client read) is about the Y.Doc of the
//   caller. A merge write and `yDocChangesAfterBase` examine the changes
//   that this Y.Doc has after `base`. A change that this Y.Doc does not have
//   yet (of a replica that did not sync) is not one of them: Yjs merges it
//   at the sync.
//
// The three writes are different only in what they do with the changes of
// other writers that the client did not read:
//
//   updateYDoc                            reverts them, where the change shows them
//   updateYDocWithMerge                   the lens merges them, by block ID
//   experimental_updateYDocWithYjsMerge   Yjs merges them
//
// The last two are in `yjsApiWithMerge.ts`: they get the version that the
// client read as `base`. `updateYDoc` has no `base`: its change is for the
// current document of the Y.Doc. On a Y.Doc that is out of date, its write
// gets the merge of Yjs at the next sync.

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
 * The result of a write to a Y.Doc: the result of `computeYDocOperations`,
 * and the Yjs update of a write that applies. With an error, the Y.Doc does
 * not change.
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
  | InvalidDocumentError;

/**
 * The Y.Doc does not have the version `base`: nothing applies. This occurs
 * if the client read from a replica with an update that this Y.Doc does not
 * have yet. Sync the Y.Doc (for example with `Y.applyUpdateV2(ydoc, base)`),
 * and call the function again.
 */
export type UnknownBaseError = { error: "unknown-base" };

/**
 * Computes the operations that change the document of the fragment of a
 * Y.Doc to agree with the change: `computeOperations`, for a Y.Doc of Yjs 14
 * (`@y/y`). Nothing changes: `applyYDocOperations` writes the operations.
 * `updateYDoc` computes and writes them in one step.
 *
 * The editor gives only the schema and the conversions of the formats: it
 * does not have to be bound to the Y.Doc, and it needs no view. Give it the
 * schema and the extensions of the other clients. If the schema cannot read
 * the fragment, the read throws.
 *
 * The change is for the current document of the fragment, as for
 * `computeOperations`: if other writers changed the document after the read
 * of the client, the write reverts their changes where the change shows
 * them. To find such changes before the write, use `yDocChangesAfterBase`.
 * To merge with them, use `computeYDocOperationsWithMerge`.
 */
export function computeYDocOperations(
  editor: BlockNoteEditor<any, any, any>,
  fragment: Y.Node,
  change: TextChange | JSONChange,
): ChangeResult {
  return operationsOf(editor, change, yfragmentToBlocks(editor, fragment));
}

/**
 * Computes the operations of a change (see `computeYDocOperations`), and
 * writes them to the fragment (see `applyYDocOperations`): `updateDocument`,
 * for a Y.Doc.
 *
 * Use it for a writer that is not the user of a bound editor: a server, an
 * agent, an import (see the README, "Which function to use"). The undo of
 * an editor does not revert the write.
 */
export function updateYDoc(
  editor: BlockNoteEditor<any, any, any>,
  fragment: Y.Node,
  change: TextChange | JSONChange,
): YDocChangeResult {
  const update = computeYDocOperations(editor, fragment, change);
  return update.error !== undefined
    ? update
    : {
        ...update,
        updateV2: applyYDocOperations(editor, fragment, update.operations),
      };
}

/**
 * Writes operations to the fragment of a Y.Doc, and returns the Yjs update
 * of the write, as a V2 update: `applyOperations`, for a Y.Doc.
 *
 * The operations must be for the current document of the fragment, as
 * `computeYDocOperations` gives them. Else the function throws before the
 * Y.Doc changes (see `applyOperations`).
 *
 * The write is one Yjs transaction. Yjs cannot revert a transaction: if Yjs
 * throws in it, a part of the write can stay (see the README, "Pipeline",
 * step 8).
 */
export function applyYDocOperations(
  editor: BlockNoteEditor<any, any, any>,
  fragment: Y.Node,
  operations: readonly BlockOperation[],
): Uint8Array {
  const ydoc = docOf(fragment);
  const before = Y.encodeStateVector(ydoc);
  applyTransactionToYjsFragment(editor.pmSchema, fragment, (tr) =>
    applyOperations(tr, operations),
  );
  return Y.encodeStateAsUpdateV2(ydoc, before);
}

/**
 * The result of `yDocChangesAfterBase`: the changes of other writers, or the
 * error `"unknown-base"`.
 */
export type YDocChangesAfterBaseResult =
  | {
      error?: undefined;
      /**
       * The operations that change the document at `base` to the current
       * document. Without operations, the document is the document that the
       * client read.
       */
      changesOfOthers: BlockOperation[];
    }
  | UnknownBaseError;

/**
 * Returns the changes that other writers made to the document of the
 * fragment of a Y.Doc after `base` (the version that a client read). Use it
 * to stop a write of a client that did not see these changes. Call it and
 * the write without an `await` between them: then no other writer can change
 * the Y.Doc between the check and the write.
 *
 * `base` is the Yjs state at the version, as a V2 update
 * (`Y.encodeStateAsUpdateV2(ydoc)`). Yjs throws for a V1 update. The Y.Doc
 * must have that version: else the result is the error `"unknown-base"`
 * (see `UnknownBaseError`).
 *
 * The check compares all data of the two documents, also the data that a
 * text format does not show (for example a text color). It does not compare
 * the state vectors of Yjs. Thus, these are not changes: a change in a
 * different part of the Y.Doc, and a change that a later change reverted.
 */
export function yDocChangesAfterBase(
  editor: BlockNoteEditor<any, any, any>,
  fragment: Y.Node,
  base: Uint8Array,
): YDocChangesAfterBaseResult {
  const atBase = fragmentAtBase(fragment, base);
  if (!hasVersion(docOf(fragment), docOf(atBase))) {
    return { error: "unknown-base" };
  }
  return {
    changesOfOthers: fragmentChangesAfterBase(editor, atBase, fragment),
  };
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
 * True if the Y.Doc has each update of `version` (a Y.Doc at the version
 * that a client read): each insert (the state vectors) and each removal
 * (the delete sets).
 *
 * @internal
 */
export function hasVersion(ydoc: Y.Doc, version: Y.Doc): boolean {
  const have = Y.snapshot(ydoc);
  const need = Y.snapshot(version);
  return (
    [...need.sv].every(
      ([client, clock]) => (have.sv.get(client) ?? 0) >= clock,
    ) && Y.equalIdSets(have.ds, Y.mergeIdSets([have.ds, need.ds]))
  );
}

/**
 * The changes of other writers to the fragment after `base`, as operations.
 * `atBase` is the fragment at `base`, in a temporary Y.Doc.
 */
function fragmentChangesAfterBase(
  editor: BlockNoteEditor<any, any, any>,
  atBase: Y.Node,
  fragment: Y.Node,
): BlockOperation[] {
  // The check compares content, not state vectors: a state vector also
  // changes for a change in a different fragment, and for a change that a
  // later change reverts.
  //
  // Usually, the content is equal, and Yjs compares it without a conversion
  // to blocks. `renderer: null`: see `applyTransactionToYjsFragment`.
  if (atBase.toDeltaDeep().equals(fragment.toDeltaDeep({ renderer: null }))) {
    return [];
  }
  // Content that is not equal can be the same blocks: for example, an empty
  // block group can stay in the fragment. Thus, the blocks decide.
  const base = yfragmentToBlocks(editor, atBase);
  const current = yfragmentToBlocks(editor, fragment);
  assertBlockIds(current, "current document");
  assertBlockIds(base, "base");
  return diffDocuments(base, current);
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
