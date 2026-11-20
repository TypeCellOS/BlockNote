import type { Block, BlockNoteEditor } from "@blocknote/core";
import {
  blockNoteTransformer,
  blocksToYType,
  docDiffToDelta,
  findTypeInOtherYdoc,
  yfragmentToBlocks,
} from "@blocknote/core/y";
import { $prosemirrorDelta, deltaToPNode } from "@y/prosemirror";
import * as Y from "@y/y";
import * as delta from "lib0/delta";
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
  return format.serialize(editor, yfragmentToBlocks(editor, fragment));
}

/**
 * The result of a write to a Y.Doc. On an error (also an exception), the
 * write does not change the Y.Doc. Only the updates of `base` that the Y.Doc
 * did not have yet apply (see `updateYDoc`).
 */
export type YDocChangeResult =
  | (ChangeOperations & {
      /**
       * The Yjs update of the write, in the V2 format: apply it with
       * `Y.applyUpdateV2`. Send it to the other clients, if no provider does
       * that.
       */
      update: Uint8Array;
    })
  | InvalidDocumentError
  | DocumentChangedError;

/**
 * Writes a change (a text, or BlockNote JSON) back to the fragment of a
 * Y.Doc of Yjs 14 (`@y/y`). To read the text, use `getYDocText`.
 *
 * Use this function for each writer that is not the user of an editor that
 * is bound to the Y.Doc: a server, an agent, an import. The write is a
 * change of another client for each editor: the undo of an editor does not
 * revert it. For a write of the user of a bound editor, use `updateDocument`
 * on that editor (see the README, "Which function to use").
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
 * at that version as a V2 update (`Y.encodeStateAsUpdateV2(ydoc)`). This is
 * the format of the versions of core, thus a stored version of core is a
 * valid `base`. A V1 update (`Y.encodeStateAsUpdate`) is not: the write
 * throws for it.
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
    const changesOfOthers = withFragmentAtBase(
      fragment,
      change.base,
      (atBase) =>
        // Usually, the content is equal, and Yjs compares the content of two
        // fragments without a conversion to blocks. Content that is not
        // equal can be the same blocks: for example, a block group that
        // became empty stays in the fragment. Thus, the blocks decide.
        //
        // `renderer: null` gives the content as it is. An editor that is
        // bound to the fragment can give it a renderer, which shows
        // different content (for example an older version).
        atBase.toDeltaDeep().equals(fragment.toDeltaDeep({ renderer: null }))
          ? []
          : changesAfterBase(
              yfragmentToBlocks(editor, atBase),
              yfragmentToBlocks(editor, fragment),
            ),
    );
    if (changesOfOthers.length > 0) {
      return { error: "document-changed", changesOfOthers };
    }
  }
  const result = writeToCopy(editor, fragment, undefined, (current) =>
    operationsOf(editor, change, current),
  );
  return result.error !== undefined
    ? result
    : { ...result, update: Y.encodeStateAsUpdateV2(ydoc, before) };
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
 * Calls `use` with the fragment at `base` (the Yjs state of the version that
 * the client read, as a V2 update). That fragment is in a temporary Y.Doc.
 *
 * Before the call, `base` makes the Y.Doc of the fragment a newer version of
 * `base`. The reason: the client can read from a replica with an update that
 * this Y.Doc does not have yet. Then `base` is not an older version of this
 * Y.Doc, and a compare or a merge with the current document sees that update
 * as removed. Yjs applies an update only one time, thus the Y.Doc gets only
 * the updates that it did not have. The update of the result contains them.
 *
 * @internal
 */
export function withFragmentAtBase<Result>(
  fragment: Y.Node,
  base: Uint8Array,
  use: (atBase: Y.Node) => Result,
): Result {
  const version = new Y.Doc();
  try {
    try {
      // First the temporary Y.Doc: if Yjs cannot read `base`, the Y.Doc of
      // the fragment does not change.
      Y.applyUpdateV2(version, base);
    } catch (cause) {
      // The usual cause is a V1 update: Yjs then throws while it decodes,
      // with a message that does not name the format.
      throw new Error(
        "Yjs cannot read `base` as a V2 update. Give the state of the Y.Doc from `Y.encodeStateAsUpdateV2`, not from `Y.encodeStateAsUpdate`.",
        { cause },
      );
    }
    Y.applyUpdateV2(docOf(fragment), base);
    return use(findTypeInOtherYdoc(fragment, version));
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
 * Yjs state `at` (a V2 update) (then Yjs merges the write with the changes after `at`).
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
    Y.applyUpdateV2(copy, at ?? Y.encodeStateAsUpdateV2(ydoc));
    const target = findTypeInOtherYdoc(fragment, copy);
    const current = yfragmentToBlocks(editor, target);
    const result = compute(current);
    if (result.error === undefined && result.operations !== undefined) {
      if (current.length === 0) {
        fillFragment(editor, target, result.operations);
      } else {
        changeFragment(editor, target, result.operations);
      }
      Y.applyUpdateV2(
        ydoc,
        Y.encodeStateAsUpdateV2(copy, Y.encodeStateVector(ydoc)),
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
 * operations: `docDiffToDelta` of core, which pairs two blocks only if they
 * have the same block ID. Thus, one difference for a write is correct, also
 * with an insert or a removal next to a changed block.
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
  const change = pipeline.applyB(
    delta.cloneDeep(docDiffToDelta(doc, tr.doc)),
  ).a;
  if (change !== null) {
    fragment.applyDelta(change);
  }
}
