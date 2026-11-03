import { withoutChildren } from "../blocks/flatten.js";
import { deepEqual } from "../blocks/json.js";
import { BlockTree } from "../blocks/tree.js";
import type { ContentKind, LensBlock } from "../blocks/types.js";
import { diffBlock, patchBlock } from "../blocks/update.js";
import { mergeBlock } from "../merge/block.js";
import type { BlockOperation, BlockPosition } from "../operations/types.js";

export type RebaseWarning =
  /** The text changed or moved a block that another writer removed. The change is not applied. */
  | { type: "change-to-removed-block"; id: string }
  /** The text removed a block that another writer changed. The block is removed, with the changes of the other writer. */
  | { type: "removed-changed-block"; id: string };

export type RebaseInput = {
  /** The document that the operations were made for. */
  base: readonly LensBlock[];
  /** A later version of `base`, with the changes of other writers. */
  current: readonly LensBlock[];
  /**
   * The document that the operations make from `base`. Its blocks are the
   * blocks that the client keeps or inserts.
   */
  target: readonly LensBlock[];
  operations: readonly BlockOperation[];
  contentKindOf: (type: string) => ContentKind;
  /**
   * Returns true if a block of the type `parent` (`undefined` for the top
   * level) can have a child of the type `child`. For example, a column list
   * has only columns, and a column is only in a column list.
   */
  canContain: (parent: string | undefined, child: string) => boolean;
};

export type RebaseResult = {
  /** The operations for `current`. */
  operations: BlockOperation[];
  warnings: RebaseWarning[];
};

/**
 * Moves operations from `base` to `current`. The operations find their
 * blocks by ID. The result keeps the changes of the other writers:
 *
 * - An update merges each field three-way: the base block, the base block
 *   with the update (ours), and the current block (theirs). See
 *   `merge/block.ts`. If both sides changed a field, the update wins.
 * - An insert or a move goes to the same position. If another writer removed
 *   the reference block, the block goes to the position of the reference
 *   block in `base` (see `available`).
 * - A move to the position that the block already has is not necessary.
 *   Thus, a move that both sides did is done one time.
 * - Changes to a block that another writer removed are not applied.
 * - A removal applies, also if another writer changed the block.
 */
export function rebaseOperations(input: RebaseInput): RebaseResult {
  const base = new BlockTree(input.base);
  const tree = new BlockTree(input.current);
  const targetTree = new BlockTree(input.target);
  const wanted = new Set(targetTree.ids);

  /** Returns true if the client removes the block: it is in `base`, but not in the target. */
  function removedByClient(id: string): boolean {
    return base.has(id) && !wanted.has(id);
  }

  /** Returns true if a block at the position would be in a block that the client removes. */
  function inRemovedBlock(position: BlockPosition): boolean {
    for (
      let parent = tree.parentAt(position);
      parent !== undefined;
      parent = tree.parent(parent)
    ) {
      if (removedByClient(parent)) {
        return true;
      }
    }
    return false;
  }

  /** The highest blocks in the block (in the current tree) that the client keeps. */
  function keptBlocksIn(id: string): string[] {
    return tree
      .childrenOf(id)
      .flatMap((child) => (wanted.has(child) ? [child] : keptBlocksIn(child)));
  }

  /** Returns true if another writer changed the block or a block in it (in the current tree). */
  function changedByOthers(id: string): boolean {
    return (
      !base.has(id) ||
      !deepEqual(
        withoutChildren(tree.block(id)),
        withoutChildren(base.block(id)),
      ) ||
      tree.childrenOf(id).some(changedByOthers)
    );
  }
  const operations: BlockOperation[] = [];
  const warnings: RebaseWarning[] = [];

  /**
   * Returns the position of a block in `tree`: after the sibling before it,
   * or first in its parent. At the start of the top level, the position is
   * the start of the document.
   */
  function positionIn(tree: BlockTree, id: string): BlockPosition {
    const previous = tree.previousSibling(id);
    if (previous !== undefined) {
      return { reference: previous, placement: "after" };
    }
    const parent = tree.parent(id);
    if (parent !== undefined) {
      return { reference: parent, placement: "first-child" };
    }
    return { placement: "start" };
  }

  /**
   * Returns `position` for the block `placed`, if its reference block is in
   * the tree, not in the block that moves, the position is not in a block
   * that the client removes, and the parent at the position can have the
   * block. If not, returns the position of the reference block in `base`,
   * with the same check. A new block of the client is not in `base`: then
   * its position in the target applies.
   */
  function available(
    position: BlockPosition,
    placed: { type: string; moved?: string },
  ): BlockPosition {
    if (position.placement === "start") {
      return position;
    }
    const { reference } = position;
    if (
      tree.has(reference) &&
      (placed.moved === undefined || !tree.isWithin(reference, placed.moved)) &&
      !inRemovedBlock(position) &&
      fitsParent(position, placed.type)
    ) {
      return position;
    }
    // The start of the document is the last fallback.
    return available(
      base.has(reference)
        ? positionIn(base, reference)
        : positionIn(targetTree, reference),
      placed,
    );
  }

  /** Returns true if the parent at the position (in the current tree) can have a block of the type. */
  function fitsParent(position: BlockPosition, type: string): boolean {
    const parent = tree.parentAt(position);
    return input.canContain(
      parent === undefined ? undefined : typeOf(parent),
      type,
    );
  }

  /** The type of a block in the current tree. A block that the client inserts is only in the target. */
  function typeOf(id: string): string {
    return (tree.byId.has(id) ? tree : targetTree).block(id).type;
  }

  /**
   * Removes the block, if it is still in the tree. The block of `base` can
   * contain blocks that the client also removes, but that another writer
   * moved out of it. These blocks go too: the client removed them.
   */
  function removeBlock(id: string) {
    const movedOut = base
      .descendantsOf(id)
      .filter(
        (descendant) =>
          removedByClient(descendant) &&
          tree.has(descendant) &&
          !tree.isWithin(descendant, id),
      );
    if (tree.has(id)) {
      // The removed block can contain blocks that the client keeps, at any
      // depth: blocks that another writer moved into it, or new blocks of
      // the text that a fallback put there. These blocks move out first, to
      // the position of the removed block.
      for (const kept of keptBlocksIn(id)) {
        const position = available(
          { reference: id, placement: "before" },
          { type: typeOf(kept), moved: kept },
        );
        operations.push({ type: "move", id: kept, ...position });
        tree.place(kept, position);
      }
      if (changedByOthers(id)) {
        warnings.push({ type: "removed-changed-block", id });
      }
      operations.push({ type: "delete", id });
      tree.remove(id);
    }
    // Else, another writer removed the block, or the block went with a
    // removed ancestor.
    for (const descendant of movedOut) {
      if (tree.has(descendant)) {
        removeBlock(descendant);
      }
    }
  }

  for (const operation of input.operations) {
    switch (operation.type) {
      case "update": {
        const { id } = operation;
        if (!tree.has(id)) {
          warnings.push({ type: "change-to-removed-block", id });
          break;
        }
        const theirs = tree.block(id);
        const update = diffBlock(
          theirs,
          mergeBlock(
            base.block(id),
            patchBlock(base.block(id), operation.update),
            theirs,
            input.contentKindOf,
            { concurrent: true },
          ),
        );
        if (update !== undefined) {
          operations.push({ type: "update", id, update });
        }
        break;
      }
      case "insert": {
        const position = available(operation, {
          type: operation.block.type,
        });
        operations.push({
          type: "insert",
          block: operation.block,
          ...position,
        });
        tree.place(operation.block.id, position);
        break;
      }
      case "move": {
        const { id } = operation;
        if (!tree.has(id)) {
          warnings.push({ type: "change-to-removed-block", id });
          break;
        }
        const position = available(operation, {
          type: tree.block(id).type,
          moved: id,
        });
        const toItself =
          position.placement !== "start" && position.reference === id;
        if (!toItself && !tree.isAt(id, position)) {
          operations.push({ type: "move", id, ...position });
          tree.place(id, position);
        }
        break;
      }
      case "delete": {
        removeBlock(operation.id);
        break;
      }
    }
  }

  return { operations, warnings };
}
