import { withoutChildren } from "../blocks/flatten.js";
import { BlockTree } from "../blocks/tree.js";
import type { LensBlock } from "../blocks/types.js";
import { diffBlock } from "../blocks/update.js";
import { myersMatch } from "../sequence/myers.js";
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
 */
export function diffDocuments(
  current: readonly LensBlock[],
  target: readonly LensBlock[],
): BlockOperation[] {
  const from = new BlockTree(current);
  const to = new BlockTree(target);
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

  function placeChildren(parent: string | undefined) {
    const children = to.childrenOf(parent);
    const candidates = from
      .childrenOf(parent)
      .filter((id) => to.has(id) && to.parent(id) === parent);
    const stays = new Set(
      myersMatch(candidates, children, (x, y) => x === y).map(
        (pair) => candidates[pair.aIndex],
      ),
    );
    children.forEach((id, index) => {
      if (stays.has(id)) {
        return;
      }
      const position: BlockPosition =
        index > 0
          ? { reference: children[index - 1], placement: "after" }
          : parent !== undefined
            ? { reference: parent, placement: "first-child" }
            : { placement: "start" };
      operations.push(
        from.has(id)
          ? { type: "move", id, ...position }
          : {
              type: "insert",
              block: isNewSubtree(id)
                ? to.block(id)
                : withoutChildren(to.block(id)),
              ...position,
            },
      );
    });
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
