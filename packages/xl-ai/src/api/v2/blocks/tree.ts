import type { BlockPlacement } from "@blocknote/core";

import type { LensBlock } from "./types.js";

/**
 * The shape of a document: the parent and the children of each block, by ID.
 * `place` and `remove` change the shape, but not the blocks. Thus, the rebase
 * can follow operations, but it does not apply them.
 */
export class BlockTree {
  /** The blocks by ID, as given (with their children). */
  readonly byId = new Map<string, LensBlock>();
  private readonly parents = new Map<string, string | undefined>();
  private readonly children = new Map<string | undefined, string[]>();

  constructor(blocks: readonly LensBlock[]) {
    this.add(blocks, undefined);
  }

  /** The IDs of all blocks, in document order (pre-order). */
  get ids(): string[] {
    const result: string[] = [];
    this.collectIds(undefined, result);
    return result;
  }

  /** Adds the blocks (with their descendants) as children of `parent`. */
  private add(list: readonly LensBlock[], parent: string | undefined) {
    for (const block of list) {
      this.byId.set(block.id, block);
      this.parents.set(block.id, parent);
      this.childrenOf(parent).push(block.id);
      this.add(block.children, block.id);
    }
  }

  /** Adds the IDs of the descendants of `parent` to `result`, in pre-order. */
  private collectIds(parent: string | undefined, result: string[]) {
    for (const id of this.childrenOf(parent)) {
      result.push(id);
      this.collectIds(id, result);
    }
  }

  has(id: string): boolean {
    return this.parents.has(id);
  }

  block(id: string): LensBlock {
    const block = this.byId.get(id);
    if (block === undefined) {
      throw new Error(`Block ${id} is not in the document`);
    }
    return block;
  }

  /** The parent of a block, or `undefined` for a top-level block. */
  parent(id: string): string | undefined {
    return this.parents.get(id);
  }

  /** The children of a block, or the top-level blocks for `undefined`. */
  childrenOf(parent: string | undefined): string[] {
    let list = this.children.get(parent);
    if (list === undefined) {
      list = [];
      this.children.set(parent, list);
    }
    return list;
  }

  previousSibling(id: string): string | undefined {
    const siblings = this.childrenOf(this.parents.get(id));
    return siblings[siblings.indexOf(id) - 1];
  }

  /** Returns true if `id` is `ancestor`, or a descendant of it. */
  isWithin(id: string, ancestor: string): boolean {
    for (
      let node: string | undefined = id;
      node !== undefined;
      node = this.parents.get(node)
    ) {
      if (node === ancestor) {
        return true;
      }
    }
    return false;
  }

  /** Returns true if the block is at the position. */
  isAt(id: string, reference: string, placement: BlockPlacement): boolean {
    const parent = this.parentAt(reference, placement);
    const siblings = this.childrenOf(parent);
    return (
      this.parents.get(id) === parent &&
      siblings.indexOf(id) ===
        indexAt(
          siblings.filter((sibling) => sibling !== id),
          reference,
          placement,
        )
    );
  }

  /** Puts a new block at the position, or moves a block (with its children) to it. */
  place(id: string, reference: string, placement: BlockPlacement) {
    if (this.parents.has(id)) {
      this.detach(id);
    }
    const parent = this.parentAt(reference, placement);
    const siblings = this.childrenOf(parent);
    siblings.splice(indexAt(siblings, reference, placement), 0, id);
    this.parents.set(id, parent);
  }

  /** Removes a block, with its descendants. */
  remove(id: string) {
    this.detach(id);
    this.forget(id);
  }

  private forget(id: string) {
    for (const child of this.childrenOf(id)) {
      this.forget(child);
    }
    this.children.delete(id);
    this.parents.delete(id);
  }

  private detach(id: string) {
    const siblings = this.childrenOf(this.parents.get(id));
    siblings.splice(siblings.indexOf(id), 1);
  }

  /** The parent of a block at the position. */
  private parentAt(
    reference: string,
    placement: BlockPlacement,
  ): string | undefined {
    return placement === "before" || placement === "after"
      ? this.parents.get(reference)
      : reference;
  }
}

/** The index of a block at the position, in the children of its parent. */
function indexAt(
  siblings: readonly string[],
  reference: string,
  placement: BlockPlacement,
): number {
  switch (placement) {
    case "before":
      return siblings.indexOf(reference);
    case "after":
      return siblings.indexOf(reference) + 1;
    case "first-child":
      return 0;
    case "last-child":
      return siblings.length;
  }
}
