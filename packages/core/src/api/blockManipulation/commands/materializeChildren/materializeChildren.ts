import type { Node as PMNode } from "prosemirror-model";
import { TextSelection, type Transaction } from "prosemirror-state";

import {
  getBlockInfo,
  getNearestBlockPos,
} from "../../../getBlockInfoFromPos.js";
import { getPmSchema } from "../../../pmUtil.js";

/**
 * Inserts `content` before whatever children the block at `blockPos` already
 * has, creating the `blockGroup` that holds them if there aren't any yet.
 *
 * That group is `content: "blockGroupChild+"`, so it can't exist empty: a
 * childless block doesn't have one, and there is no position inside it to
 * insert at. Every path that puts the first block into such a block has to
 * create the group and its first occupant together, which is what this does —
 * a block that already has children just gets them prepended.
 *
 * @returns The position just before the first inserted child block. Use
 * `TextSelection.near(tr.doc.resolve(pos), 1)` to put the text cursor in it.
 */
export function materializeChildren(
  tr: Transaction,
  blockPos: number,
  content: PMNode | readonly PMNode[],
): number {
  const info = getBlockInfo(getNearestBlockPos(tr.doc, blockPos));

  const nodes = Array.isArray(content) ? content : [content as PMNode];

  if (info.childContainer) {
    const insertPos = info.childContainer.beforePos + 1;
    tr.insert(insertPos, nodes);

    return insertPos;
  }

  // No group yet, so it's created here along with its first occupant. It goes
  // at the very end of the block, just inside it — which for a `blockContainer`
  // is right after its content node, and only a `blockContainer` can be without
  // a child container in the first place (columns and column lists always have
  // one).
  const schema = getPmSchema(tr);
  const insertPos = info.bnBlock.afterPos - 1;
  tr.insert(insertPos, schema.nodes["blockGroup"].create(null, nodes));

  // `insertPos` is just before the new `blockGroup`, so the first child starts
  // one position further in.
  return insertPos + 1;
}

/**
 * Inserts an empty paragraph as the first child of the block at `blockPos` and
 * puts the text cursor in it.
 */
export function insertEmptyFirstChild(tr: Transaction, blockPos: number) {
  const schema = getPmSchema(tr);
  const childPos = materializeChildren(
    tr,
    blockPos,
    schema.nodes["blockContainer"].createAndFill(
      undefined,
      schema.nodes["paragraph"].createAndFill() ?? undefined,
    )!,
  );

  tr.setSelection(TextSelection.near(tr.doc.resolve(childPos), 1));
  tr.scrollIntoView();
}
