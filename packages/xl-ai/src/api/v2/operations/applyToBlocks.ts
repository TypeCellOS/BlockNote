import type { LensBlock } from "../blocks/index.js";
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
 */
export function applyToBlocks(
  document: readonly LensBlock[],
  operations: readonly BlockOperation[],
): BlockShape[] {
  const root: BlockShape[] = [];
  const shapes = new Map<string, BlockShape>();
  const parents = new Map<string, BlockShape[]>();
  function add(blocks: readonly LensBlock[], list: BlockShape[]) {
    for (const block of blocks) {
      const shape: BlockShape = { block, children: [] };
      shapes.set(block.id, shape);
      parents.set(block.id, list);
      list.push(shape);
      add(block.children, shape.children);
    }
  }
  add(document, root);

  function shapeOf(id: string): BlockShape {
    const shape = shapes.get(id);
    if (shape === undefined) {
      throw new Error(`Block ${id} is not in the document`);
    }
    return shape;
  }
  function detach(id: string) {
    const list = parents.get(id);
    if (list !== undefined) {
      list.splice(list.indexOf(shapeOf(id)), 1);
    }
  }
  function place(shape: BlockShape, position: BlockPosition) {
    const [list, index] = slotOf(position);
    list.splice(index, 0, shape);
    parents.set(shape.block.id, list);
  }
  /** The list of siblings and the index in it at the position. */
  function slotOf(position: BlockPosition): [BlockShape[], number] {
    if (position.placement === "start") {
      return [root, 0];
    }
    const reference = shapeOf(position.reference);
    const siblings = parents.get(position.reference) ?? root;
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

  for (const operation of operations) {
    switch (operation.type) {
      case "update":
        break;
      case "insert": {
        // A new block can come with its new children.
        const list: BlockShape[] = [];
        add([operation.block], list);
        place(list[0], operation);
        break;
      }
      case "move": {
        const shape = shapeOf(operation.id);
        detach(operation.id);
        place(shape, operation);
        break;
      }
      case "delete":
        detach(operation.id);
        break;
    }
  }
  return root;
}
