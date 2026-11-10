import type { LensBlock } from "../model.js";
import type { BlockOperation, BlockPosition } from "./types.js";

/**
 * The structure of a document after operations: each block by its ID, with
 * its children, in order. `block` is the block of the insert (for a new
 * block), or the block of the document.
 */
export type BlockShape = { block: LensBlock; children: BlockShape[] };

/**
 * Returns the structure that the operations give for the document: the
 * inserts, the moves and the removals, in sequence. Updates do not change
 * the structure. This is a pure function: the apply then makes the
 * ProseMirror document agree with the result (see `applyOperations`).
 *
 * Throws for an operation that the document cannot have at that point: a
 * block or a reference that is not in the document (also a block that an
 * earlier operation removed), an insert of a block ID that is in the
 * document, or a move of a block into itself (also before or after itself).
 */
export function applyToBlocks(
  document: readonly LensBlock[],
  operations: readonly BlockOperation[],
): BlockShape[] {
  const shapes = new Shapes(document);
  for (const operation of operations) {
    switch (operation.type) {
      case "update":
        break;
      case "insert":
        shapes.insert(operation.block, operation);
        break;
      case "move":
        shapes.move(operation.id, operation);
        break;
      case "delete":
        shapes.remove(operation.id);
        break;
    }
  }
  return shapes.root;
}

/**
 * The structure during the operations: the shape of each block that is in
 * the document, and the list of siblings that holds it.
 */
class Shapes {
  readonly root: BlockShape[] = [];
  private readonly byId = new Map<string, BlockShape>();
  private readonly lists = new Map<string, BlockShape[]>();

  constructor(document: readonly LensBlock[]) {
    this.add(document, this.root);
  }

  /** Inserts a new block. It can come with its new children. */
  insert(block: LensBlock, position: BlockPosition) {
    const list: BlockShape[] = [];
    this.add([block], list);
    this.place(list[0], position);
  }

  move(id: string, position: BlockPosition) {
    const shape = this.shapeOf(id);
    if (position.placement !== "start" && contains(shape, position.reference)) {
      throw new Error(`A move of block ${id} into itself`);
    }
    this.detach(shape);
    this.place(shape, position);
  }

  /** Removes the block and the blocks in it. */
  remove(id: string) {
    const shape = this.shapeOf(id);
    this.detach(shape);
    const forget = (removed: BlockShape) => {
      this.byId.delete(removed.block.id);
      this.lists.delete(removed.block.id);
      removed.children.forEach(forget);
    };
    forget(shape);
  }

  private add(blocks: readonly LensBlock[], list: BlockShape[]) {
    for (const block of blocks) {
      if (this.byId.has(block.id)) {
        throw new Error(`Block ${block.id} is already in the document`);
      }
      const shape: BlockShape = { block, children: [] };
      this.byId.set(block.id, shape);
      this.lists.set(block.id, list);
      list.push(shape);
      this.add(block.children, shape.children);
    }
  }

  private shapeOf(id: string): BlockShape {
    const shape = this.byId.get(id);
    if (shape === undefined) {
      throw new Error(`Block ${id} is not in the document`);
    }
    return shape;
  }

  private detach(shape: BlockShape) {
    const list = this.lists.get(shape.block.id);
    const index = list?.indexOf(shape) ?? -1;
    if (list === undefined || index === -1) {
      throw new Error(`Block ${shape.block.id} is not in its list`);
    }
    list.splice(index, 1);
  }

  private place(shape: BlockShape, position: BlockPosition) {
    const [list, index] = this.slotOf(position);
    list.splice(index, 0, shape);
    this.lists.set(shape.block.id, list);
  }

  /** The list of siblings and the index in it at the position. */
  private slotOf(position: BlockPosition): [BlockShape[], number] {
    if (position.placement === "start") {
      return [this.root, 0];
    }
    const reference = this.shapeOf(position.reference);
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

/** True if the block with the ID `id` is the shape or a block in it. */
function contains(shape: BlockShape, id: string): boolean {
  return (
    shape.block.id === id || shape.children.some((child) => contains(child, id))
  );
}
