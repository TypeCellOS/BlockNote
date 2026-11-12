import type { LensBlock } from "../../model.js";

const NO_CHILDREN: readonly string[] = [];

/**
 * The parent of the top-level blocks of a document. The lens uses
 * `undefined` for it: `BlockIndex.parent` of a top-level block is
 * `TOP_LEVEL`, and `childrenOf(TOP_LEVEL)` gives the top-level blocks.
 */
export const TOP_LEVEL = undefined;

/** The parent of a block: the ID of a block, or `TOP_LEVEL` for a top-level block. */
export type Parent = string | typeof TOP_LEVEL;

/**
 * An index of the shape of a document, for a lookup by ID: the parent and
 * the children of each block. It does not change.
 */
export class BlockIndex {
  private readonly blocks = new Map<string, LensBlock>();
  private readonly parents = new Map<string, Parent>();
  private readonly children = new Map<Parent, string[]>();
  private readonly indexes = new Map<string, number>();

  constructor(blocks: readonly LensBlock[]) {
    this.add(blocks, TOP_LEVEL);
  }

  /** The blocks by ID, as given (with their children). */
  get byId(): ReadonlyMap<string, LensBlock> {
    return this.blocks;
  }

  /** The IDs of all blocks, in document order (pre-order). */
  get ids(): string[] {
    // `add` adds each block before its children.
    return [...this.blocks.keys()];
  }

  /** Adds the blocks (with their descendants) as children of `parent`. */
  private add(list: readonly LensBlock[], parent: Parent) {
    if (list.length === 0) {
      return;
    }
    let siblings = this.children.get(parent);
    if (siblings === undefined) {
      siblings = [];
      this.children.set(parent, siblings);
    }
    for (const block of list) {
      this.blocks.set(block.id, block);
      this.parents.set(block.id, parent);
      this.indexes.set(block.id, siblings.length);
      siblings.push(block.id);
      this.add(block.children, block.id);
    }
  }

  has(id: string): boolean {
    return this.parents.has(id);
  }

  block(id: string): LensBlock {
    const block = this.blocks.get(id);
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

  /** The parent of a block, or `TOP_LEVEL` for a top-level block. */
  parent(id: string): Parent {
    return this.parents.get(id);
  }

  /** The children of a block, or the top-level blocks for `TOP_LEVEL`. */
  childrenOf(parent: Parent): readonly string[] {
    return this.children.get(parent) ?? NO_CHILDREN;
  }
}
