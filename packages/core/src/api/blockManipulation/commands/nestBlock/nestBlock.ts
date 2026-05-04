import { Fragment, NodeRange, NodeType, Slice } from "prosemirror-model";
import { Transaction } from "prosemirror-state";
import { canJoin, liftTarget, ReplaceAroundStep } from "prosemirror-transform";

import { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import { getBlockInfoFromTransaction } from "../../../getBlockInfoFromPos.js";

/**
 * Modified version of prosemirror-schema-list's sinkItem.
 * https://github.com/ProseMirror/prosemirror-schema-list/blob/master/src/schema-list.ts
 *
 * Changes from the original:
 * 1. Range predicate checks node.type instead of firstChild.type
 * 2. nestedBefore checks groupType instead of parent.type
 * 3. Slice creates groupType instead of parent.type
 * 4. Operates on Transaction directly instead of state+dispatch
 */
function sinkItem(
  tr: Transaction,
  itemType: NodeType,
  groupType: NodeType,
) {
  const { $from, $to } = tr.selection;
  const range = $from.blockRange(
    $to,
    (node) =>
      node.childCount > 0 &&
      (node.type.name === "blockGroup" || node.type.name === "column"), // change 1
  );
  if (!range) {
    return false;
  }
  const startIndex = range.startIndex;
  if (startIndex === 0) {
    return false;
  }
  const parent = range.parent;
  const nodeBefore = parent.child(startIndex - 1);
  if (nodeBefore.type !== itemType) {
    return false;
  }
  const nestedBefore =
    nodeBefore.lastChild && nodeBefore.lastChild.type === groupType; // change 2
  const inner = Fragment.from(nestedBefore ? itemType.create() : null);
  const slice = new Slice(
    Fragment.from(
      itemType.create(null, Fragment.from(groupType.create(null, inner))), // change 3
    ),
    nestedBefore ? 3 : 1,
    0,
  );

  const before = range.start;
  const after = range.end;

  tr.step(
    new ReplaceAroundStep(
      before - (nestedBefore ? 3 : 1),
      after,
      before,
      after,
      slice,
      1,
      true,
    ),
  ).scrollIntoView();

  return true;
}

export function nestBlock(editor: BlockNoteEditor<any, any, any>) {
  return editor.transact((tr) => {
    return sinkItem(
      tr,
      editor.pmSchema.nodes["blockContainer"],
      editor.pmSchema.nodes["blockGroup"],
    );
  });
}

/**
 * Modified version of prosemirror-schema-list's liftToOuterList.
 * https://github.com/ProseMirror/prosemirror-schema-list/blob/master/src/schema-list.ts
 *
 * Changes from the original:
 * 1. Operates on Transaction directly instead of state+dispatch (TipTap compat)
 * 2. When the lifted block already has children (a groupType child), uses deeper
 *    openStart/offset so siblings merge into the existing group instead of
 *    creating a second one (which would violate blockContainer's schema)
 * 3. Uses groupType.create() instead of range.parent.copy() (same as sinkItem)
 */
function liftToOuterList(
  tr: Transaction,
  itemType: NodeType,
  groupType: NodeType, // change 3
  range: NodeRange,
) {
  const end = range.end;
  const endOfList = range.$to.end(range.depth);

  if (end < endOfList) {
    // There are siblings after the lifted items, which must become
    // children of the last item
    const blockBeingLifted = range.parent.child(range.endIndex - 1);
    const nestedAfter =
      blockBeingLifted.lastChild &&
      blockBeingLifted.lastChild.type === groupType; // change 2

    tr.step(
      new ReplaceAroundStep(
        end - (nestedAfter ? 2 : 1), // change 2: go deeper when merging into existing children
        endOfList,
        end,
        endOfList,
        new Slice(
          Fragment.from(
            itemType.create(null, groupType.create()), // change 3
          ),
          nestedAfter ? 2 : 1, // change 2: open deeper when merging into existing children
          0,
        ),
        nestedAfter ? 0 : 1, // change 2: Slice.insertAt offsets by openStart, so 0+2=2 lands inside existing bg
        true,
      ),
    );
    range = new NodeRange(
      tr.doc.resolve(range.$from.pos),
      tr.doc.resolve(endOfList),
      range.depth,
    );
  }

  const target = liftTarget(range);
  if (target == null) {
    return false;
  }

  tr.lift(range, target);

  const $after = tr.doc.resolve(tr.mapping.map(end, -1) - 1);
  if (
    canJoin(tr.doc, $after.pos) &&
    $after.nodeBefore!.type === $after.nodeAfter!.type
  ) {
    tr.join($after.pos);
  }

  tr.scrollIntoView();
  return true;
}

/**
 * Modified version of prosemirror-schema-list's liftListItem.
 * https://github.com/ProseMirror/prosemirror-schema-list/blob/master/src/schema-list.ts
 *
 * Changes from the original:
 * 1. Range predicate checks node.type instead of firstChild.type (same as sinkItem)
 * 2. Passes groupType to liftToOuterList
 * 3. Operates on Transaction directly instead of state+dispatch
 * 4. Skips liftOutOfList (root-level blocks can't be unnested in BlockNote)
 */
export function liftItem(
  tr: Transaction,
  itemType: NodeType,
  groupType: NodeType, // change 2
) {
  const { $from, $to } = tr.selection;
  const range = $from.blockRange(
    $to,
    (node) =>
      node.childCount > 0 &&
      (node.type.name === "blockGroup" || node.type.name === "column"), // change 1
  );
  if (!range) {
    return false;
  }

  if ($from.node(range.depth - 1).type === itemType) {
    // Inside a parent node
    return liftToOuterList(tr, itemType, groupType, range); // change 2
  }

  // This is the "liftOutOfList" path — lifting out of a list entirely.
  // Not applicable to BlockNote (root-level blocks can't be unnested). // change 4
  return false;
}

export function unnestBlock(editor: BlockNoteEditor<any, any, any>) {
  return editor.transact((tr) =>
    liftItem(
      tr,
      editor.pmSchema.nodes["blockContainer"],
      editor.pmSchema.nodes["blockGroup"],
    ),
  );
}

export function canNestBlock(editor: BlockNoteEditor<any, any, any>) {
  return editor.transact((tr) => {
    const { bnBlock: blockContainer } = getBlockInfoFromTransaction(tr);

    return tr.doc.resolve(blockContainer.beforePos).nodeBefore !== null;
  });
}

export function canUnnestBlock(editor: BlockNoteEditor<any, any, any>) {
  return editor.transact((tr) => {
    const { bnBlock: blockContainer } = getBlockInfoFromTransaction(tr);

    return tr.doc.resolve(blockContainer.beforePos).depth > 1;
  });
}
