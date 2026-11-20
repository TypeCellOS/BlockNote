import type { LensBlock } from "../model.js";
import type { BlockPosition, StructureOperation } from "./types.js";

/**
 * Returns the document after the structure operations (the inserts, the
 * moves and the removals), in sequence. It takes no updates: an update does
 * not change the structure, and `applyOperations` applies the updates before
 * it calls this function.
 *
 * This is a pure function: a document and structure operations in, a
 * document out. Each block of the result is a copy with its new list of
 * children. Thus, the blocks of `current` and of the operations do not
 * change. The apply then makes the ProseMirror document agree with the
 * result (see `applyStructure`).
 *
 * A new block has an ID that the current document does not have, also if an
 * earlier operation of the list removed that block: an insert cannot bring
 * a removed block back. The apply would give that block its old node, thus
 * its old content, type and props (see `nodeBuilder` in `applyStructure`).
 *
 * Throws for an operation that the document cannot have at that point: a
 * block or a reference that is not in the document (also a block that an
 * earlier operation removed), an insert of a block ID that is in the
 * document or that an earlier operation removed (the block, or a block in
 * it), or a move of a block into itself (also before or after itself).
 */
export function applyToBlocks(
  current: readonly LensBlock[],
  operations: readonly StructureOperation[],
): LensBlock[] {
  const lists = new BlockLists(current);
  for (const operation of operations) {
    switch (operation.type) {
      case "insert":
        lists.insert(operation.block, operation);
        break;
      case "move":
        lists.move(operation.id, operation);
        break;
      case "delete":
        lists.remove(operation.id);
        break;
    }
  }
  return lists.root;
}

/**
 * The document during the operations: a copy of each block that is in the
 * document, and the list of siblings that holds it.
 */
class BlockLists {
  readonly root: LensBlock[] = [];
  private readonly byId = new Map<string, LensBlock>();
  private readonly lists = new Map<string, LensBlock[]>();
  /** The IDs of the blocks that the operations removed. */
  private readonly removed = new Set<string>();

  constructor(current: readonly LensBlock[]) {
    this.add(current, this.root);
  }

  /** Inserts a new block. It can come with its new children. */
  insert(block: LensBlock, position: BlockPosition) {
    const list: LensBlock[] = [];
    this.add([block], list);
    this.place(list[0], position);
  }

  move(id: string, position: BlockPosition) {
    const block = this.blockOf(id);
    if (position.placement !== "start" && contains(block, position.reference)) {
      throw new Error(`A move of block ${id} into itself`);
    }
    this.detach(block);
    this.place(block, position);
  }

  /** Removes the block and the blocks in it. */
  remove(id: string) {
    const block = this.blockOf(id);
    this.detach(block);
    const forget = (removed: LensBlock) => {
      this.byId.delete(removed.id);
      this.removed.add(removed.id);
      this.lists.delete(removed.id);
      removed.children.forEach(forget);
    };
    forget(block);
  }

  /**
   * Adds a copy of each block to `list`, with a new list of children for
   * the copies of its children. The blocks of the caller do not change.
   */
  private add(blocks: readonly LensBlock[], list: LensBlock[]) {
    for (const block of blocks) {
      if (this.removed.has(block.id)) {
        throw new Error(
          `Block ${block.id} is a block that an earlier operation removed. An insert cannot bring a removed block back: a move keeps a block.`,
        );
      }
      if (this.byId.has(block.id)) {
        throw new Error(`Block ${block.id} is already in the document`);
      }
      const copy: LensBlock = { ...block, children: [] };
      this.byId.set(copy.id, copy);
      this.lists.set(copy.id, list);
      list.push(copy);
      this.add(block.children, copy.children);
    }
  }

  private blockOf(id: string): LensBlock {
    const block = this.byId.get(id);
    if (block === undefined) {
      throw new Error(`Block ${id} is not in the document`);
    }
    return block;
  }

  private detach(block: LensBlock) {
    const list = this.lists.get(block.id);
    const index = list?.indexOf(block) ?? -1;
    if (list === undefined || index === -1) {
      throw new Error(`Block ${block.id} is not in its list`);
    }
    list.splice(index, 1);
  }

  private place(block: LensBlock, position: BlockPosition) {
    const [list, index] = this.slotOf(position);
    list.splice(index, 0, block);
    this.lists.set(block.id, list);
  }

  /** The list of siblings and the index in it at the position. */
  private slotOf(position: BlockPosition): [LensBlock[], number] {
    if (position.placement === "start") {
      return [this.root, 0];
    }
    const reference = this.blockOf(position.reference);
    const siblings = this.lists.get(position.reference) ?? this.root;
    switch (position.placement) {
      case "before":
        return [siblings, siblings.indexOf(reference)];
      case "after":
        return [siblings, siblings.indexOf(reference) + 1];
      case "first-child":
        return [reference.children, 0];
      case "last-child":
        return [reference.children, reference.children.length];
    }
  }
}

/** True if the block with the ID `id` is the block or a block in it. */
function contains(block: LensBlock, id: string): boolean {
  return block.id === id || block.children.some((child) => contains(child, id));
}
