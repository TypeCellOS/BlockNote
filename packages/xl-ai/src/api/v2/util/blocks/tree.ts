import type { LensBlock } from "../../model.js";

/**
 * The shape of a document, for a lookup by ID: the parent and the children
 * of each block. It does not change.
 */
export class BlockTree {
  /** The blocks by ID, as given (with their children). */
  readonly byId = new Map<string, LensBlock>();
  private readonly parents = new Map<string, string | undefined>();
  private readonly children = new Map<string | undefined, string[]>();
  private readonly indexes = new Map<string, number>();

  constructor(blocks: readonly LensBlock[]) {
    this.add(blocks, undefined);
  }

  /** The IDs of all blocks, in document order (pre-order). */
  get ids(): string[] {
    // `add` adds each block before its children.
    return [...this.byId.keys()];
  }

  /** Adds the blocks (with their descendants) as children of `parent`. */
  private add(list: readonly LensBlock[], parent: string | undefined) {
    for (const block of list) {
      this.byId.set(block.id, block);
      this.parents.set(block.id, parent);
      const siblings = this.childrenOf(parent);
      this.indexes.set(block.id, siblings.length);
      siblings.push(block.id);
      this.add(block.children, block.id);
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

  /** The index of a block in the children of its parent. */
  index(id: string): number {
    const index = this.indexes.get(id);
    if (index === undefined) {
      throw new Error(`Block ${id} is not in the document`);
    }
    return index;
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
}
