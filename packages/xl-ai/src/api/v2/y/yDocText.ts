import type { Block, BlockNoteEditor } from "@blocknote/core";
import {
  blockNoteTransformer,
  blocksToYType,
  findTypeInOtherYdoc,
  yfragmentToBlocks,
} from "@blocknote/core/y";
import { $prosemirrorDelta, deltaToPNode, nodeToDelta } from "@y/prosemirror";
import * as Y from "@y/y";
import * as delta from "lib0/delta";
import type * as schema from "lib0/schema";
import type { Node } from "prosemirror-model";
import { EditorState } from "prosemirror-state";

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
import type { LensBlock } from "../model.js";
import {
  applyOperations,
  applyToBlocks,
  type BlockOperation,
  type StructureOperation,
} from "../operations/index.js";

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
  return format.serialize(editor, blocksOf(editor, fragment));
}

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
 * Writes a change (a text, or BlockNote JSON) back to the fragment of a
 * Y.Doc of Yjs 14 (`@y/y`). To read the text, use `getYDocText`.
 *
 * The editor gives only the schema and the conversions of the formats. It
 * does not have to be bound to the Y.Doc, and it needs no view. The reason:
 * with Yjs 14, a ProseMirror document maps to a Y.Doc, and a Y.Doc to a
 * ProseMirror document, with functions of `@y/prosemirror` and
 * `@blocknote/core/y`, through the same pipeline as the binding of an
 * editor. Thus, the write does not go through an editor view. An editor that
 * is bound to the Y.Doc gets the write as a change of another client.
 *
 * Give the editor the schema and the extensions of the other clients (for
 * example comments). If the schema cannot read the content of the fragment,
 * the read of the fragment throws (in `@y/prosemirror`), and the Y.Doc does
 * not change.
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
  fragment: Y.Node,
  change: (TextChange | JSONChange) & WriteFromVersion<Uint8Array>,
): YDocChangeResult {
  const ydoc = docOf(fragment);
  requireBase(change.base);
  const before = Y.encodeStateVector(ydoc);
  if (change.base !== "current") {
    const base = applyBase(editor, fragment, change.base);
    // The check comes before the copy of the Y.Doc: a write that does not
    // apply costs one diff of the documents.
    const changesOfOthers = changesAfterBase(base, blocksOf(editor, fragment));
    if (changesOfOthers.length > 0) {
      return { error: "document-changed", changesOfOthers };
    }
  }
  const result = writeToCopy(editor, fragment, undefined, (current) =>
    operationsOf(editor, change, current),
  );
  return result.error !== undefined
    ? result
    : { ...result, update: Y.encodeStateAsUpdate(ydoc, before) };
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
 * The blocks of the fragment. A fragment without content has no blocks: the
 * one empty block that an editor shows for it is not in the Y.Doc.
 *
 * @internal
 */
export function blocksOf(
  editor: BlockNoteEditor<any, any, any>,
  fragment: Y.Node,
): LensBlock[] {
  return yfragmentToBlocks(editor, fragment);
}

/**
 * Makes the Y.Doc a newer version of `base` (the Yjs state of the version
 * that the client read), and returns the blocks of the fragment at `base`.
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
  fragment: Y.Node,
  base: Uint8Array,
): LensBlock[] {
  Y.applyUpdate(docOf(fragment), base);
  const version = new Y.Doc();
  try {
    Y.applyUpdate(version, base);
    return blocksOf(editor, findTypeInOtherYdoc(fragment, version));
  } finally {
    version.destroy();
  }
}

/**
 * Computes the operations of a write for the document of the fragment (with
 * `compute`), and writes them to the fragment. Returns the result of
 * `compute`.
 *
 * The write goes to a copy of the Y.Doc: at the current state, or at the
 * Yjs state `at` (then Yjs merges the write with the changes after `at`).
 * The Y.Doc gets the changes of the copy as one Yjs update, after the write
 * to the copy is complete. Thus, a write that fails (an error, or an
 * exception in the middle) does not change the Y.Doc.
 *
 * @internal
 */
export function writeToCopy<
  Result extends { error?: string; operations?: readonly BlockOperation[] },
>(
  editor: BlockNoteEditor<any, any, any>,
  fragment: Y.Node,
  at: Uint8Array | undefined,
  compute: (current: readonly LensBlock[]) => Result,
): Result {
  const ydoc = docOf(fragment);
  const copy = new Y.Doc();
  try {
    Y.applyUpdate(copy, at ?? Y.encodeStateAsUpdate(ydoc));
    const target = findTypeInOtherYdoc(fragment, copy);
    const current = blocksOf(editor, target);
    const result = compute(current);
    if (result.error === undefined && result.operations !== undefined) {
      if (current.length === 0) {
        fillFragment(editor, target, result.operations);
      } else {
        changeFragment(editor, target, result.operations);
      }
      Y.applyUpdate(
        ydoc,
        Y.encodeStateAsUpdate(copy, Y.encodeStateVector(ydoc)),
      );
    }
    return result;
  } finally {
    copy.destroy();
  }
}

/**
 * Writes the operations to a fragment without content. Such a fragment has
 * no blocks, thus each operation is an insert, and the blocks of the inserts
 * are the document. `blocksToYType` of core puts them into the fragment.
 */
function fillFragment(
  editor: BlockNoteEditor<any, any, any>,
  fragment: Y.Node,
  operations: readonly BlockOperation[],
): void {
  const blocks = applyToBlocks(
    [],
    operations.filter(
      (operation): operation is StructureOperation =>
        operation.type !== "update",
    ),
  );
  blocksToYType(editor, blocks as Block<any, any, any>[], fragment);
}

/**
 * Applies the operations to the document of a fragment with blocks, and
 * writes the change to the fragment, in one Yjs transaction.
 *
 * The document is the ProseMirror document that the binding of an editor
 * shows for the fragment. The pipeline of the binding (`blockNoteTransformer`
 * of core) maps the content of the fragment to that document, and a change
 * of the document back to a change of the fragment. For example, the
 * fragment keeps the empty block groups, and the document does not have
 * them.
 *
 * The change is the difference of the document before and after the
 * operations (see `differenceOf`).
 */
function changeFragment(
  editor: BlockNoteEditor<any, any, any>,
  fragment: Y.Node,
  operations: readonly BlockOperation[],
): void {
  const schema = editor.pmSchema;
  const render = fragment.toDeltaDeep();
  const pipeline = blockNoteTransformer({ getState: () => render, schema })(
    $prosemirrorDelta,
  ).init();
  // The pipeline changes the delta that it gets. Thus, it gets a copy, as in
  // the binding (`lib0/delta/rdt`).
  const doc = deltaToPNode(
    pipeline.applyA(delta.cloneDeep(render)).b ?? render,
    schema,
    null,
  );
  // A state without plugins: the operations give a complete document (a
  // block that the fill of the schema adds gets its ID in the apply).
  const tr = EditorState.create({ doc }).tr;
  applyOperations(tr, operations);
  const change = pipeline.applyB(delta.cloneDeep(differenceOf(doc, tr.doc))).a;
  if (change !== null) {
    fragment.applyDelta(change);
  }
}

/** A node of a ProseMirror document, as a delta. */
type DocumentDelta = schema.Unwrap<typeof $prosemirrorDelta>;

/**
 * The difference of two ProseMirror documents, as a delta.
 *
 * The difference changes an old node into a new node in place only if the
 * two are the same node (see `isSameNode`). `docDiffToDelta` of core pairs
 * the changed nodes of a list by their type, not by their block ID. Then,
 * with an insert or a removal next to a changed block, a block of the Y.Doc
 * gets the content of a different block, and a change of another writer goes
 * into the wrong block (see the tests "a write to a Y.Doc while another
 * replica types").
 */
function differenceOf(previous: Node, next: Node) {
  return delta.diff(nodeToDelta(previous).done(), nodeToDelta(next).done(), {
    compare: isSameNode,
  });
}

/**
 * Returns true if the old node `a` and the new node `b` are the same node:
 * they have the same node type and the same block ID (a node that is not a
 * block has no ID). A block container must also have the same type of
 * content. This is the rule of `blockMatchNodes` of core: a block with a new
 * type replaces the old block, because a change in place can give a block
 * with two contents if two writers change the type at the same time.
 */
function isSameNode(a: DocumentDelta, b: DocumentDelta): boolean {
  return (
    a.name === b.name &&
    blockIdOf(a) === blockIdOf(b) &&
    (a.name !== "blockContainer" || contentTypeOf(a) === contentTypeOf(b))
  );
}

/** The block ID of a node, or `undefined` for a node without an ID. */
function blockIdOf(node: DocumentDelta): unknown {
  const id: unknown = node.attrs.id;
  return delta.$setAttrOp.check(id) ? id.value : undefined;
}

/** The node type of the content of a block container, for example "paragraph". */
function contentTypeOf(container: DocumentDelta): string | null | undefined {
  for (const op of container.children) {
    if (delta.$insertOp.check(op)) {
      for (const item of op.insert) {
        if (delta.$deltaAny.check(item)) {
          return item.name;
        }
      }
    }
  }
  return undefined;
}
