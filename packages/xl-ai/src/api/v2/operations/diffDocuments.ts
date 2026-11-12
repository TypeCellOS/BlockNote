import type { LensBlock } from "../model.js";
import {
  BlockIndex,
  diffBlock,
  withoutChildren,
} from "../util/blocks/index.js";
import { myersMatch } from "../util/sequence/index.js";
import type { BlockOperation, BlockPosition } from "./types.js";

/**
 * Returns the operations that change `current` into `target`. The two
 * documents share block IDs: a block with the same ID is the same block.
 *
 * - An update for each block with changed fields.
 * - In each parent, the blocks that keep their order stay (a longest common
 *   subsequence of the child IDs). Each other block goes after the block
 *   before it in `target`, or first in its parent: a move for a block of
 *   `current`, or an insert for a new block. A new block with only new
 *   blocks in it goes in one insert, with its children. Thus, a block that
 *   must have children (for example a column list) is never empty.
 * - A delete for each block that is not in `target`. The deletes come last.
 *   Thus, the blocks that stay moved out of the removed blocks first.
 *
 * Method: our own design, built on a longest common subsequence (the Myers
 * diff) of each list of children.
 */
export function diffDocuments(
  current: readonly LensBlock[],
  target: readonly LensBlock[],
): BlockOperation[] {
  const from = new BlockIndex(current);
  const to = new BlockIndex(target);
  const operations: BlockOperation[] = [];

  for (const id of to.ids) {
    const before = from.byId.get(id);
    const update = before && diffBlock(before, to.block(id));
    if (update !== undefined) {
      operations.push({ type: "update", id, update });
    }
  }

  /** Returns true if the block and all the blocks in it are new. */
  function isNewSubtree(id: string): boolean {
    return !from.has(id) && to.childrenOf(id).every(isNewSubtree);
  }

  /**
   * Adds the moves and the inserts that give the children of `parent` the
   * order of `target`. Then does the same for each child.
   *
   * Example: the children are `[a, b, c]` in `current` and `[c, a, x, b]` in
   * `target`. The match gives the pairs `{ aIndex: 0, bIndex: 1 }` (a) and
   * `{ aIndex: 1, bIndex: 3 }` (b). Thus, a and b stay. c moves to the first
   * place, and x goes in after a.
   */
  function placeChildren(parent: string | undefined) {
    const children = to.childrenOf(parent);
    // The children of `current` that `target` also has in this parent, in
    // the order of `current`. Only these can stay where they are.
    const candidates = from
      .childrenOf(parent)
      .filter((id) => to.has(id) && to.parent(id) === parent);
    // A longest common subsequence of the two orders. Each pair links
    // `candidates[aIndex]` and `children[bIndex]`: the same block.
    const matches = myersMatch(candidates, children, (x, y) => x === y);
    // The matched blocks keep their order. Each other child moves or is new.
    const stays = new Set(matches.map(({ aIndex }) => candidates[aIndex]));
    children.forEach((id, index) => {
      if (stays.has(id)) {
        return;
      }
      // The child goes after the child before it in `target`, or first in
      // its parent. The child before it has its place already, because the
      // loop goes in the order of `target`.
      const position: BlockPosition =
        index > 0
          ? { reference: children[index - 1], placement: "after" }
          : parent !== undefined
            ? { reference: parent, placement: "first-child" }
            : { placement: "start" };
      if (from.has(id)) {
        operations.push({ type: "move", id, ...position });
        return;
      }
      // A new block with only new blocks in it goes in with its children.
      // Else, it goes in without them, and its children get their own
      // operations below.
      const block = isNewSubtree(id)
        ? to.block(id)
        : withoutChildren(to.block(id));
      operations.push({ type: "insert", block, ...position });
    });
    // A new subtree went in complete. Each other child places its children.
    for (const id of children) {
      if (!isNewSubtree(id)) {
        placeChildren(id);
      }
    }
  }
  placeChildren(undefined);

  for (const id of from.ids) {
    const parent = from.parent(id);
    if (!to.has(id) && (parent === undefined || to.has(parent))) {
      operations.push({ type: "delete", id });
    }
  }

  return operations;
}
