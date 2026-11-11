import type { FlatBlock, LensBlock } from "../../model.js";

/** Returns the fields of the block, without its children. */
export function withoutChildren(block: LensBlock): LensBlock {
  return { ...block, children: [] };
}

/** Makes a flat list from nested blocks, in pre-order (document order). */
export function flattenBlocks(blocks: readonly LensBlock[]): FlatBlock[] {
  const result: FlatBlock[] = [];

  function visit(
    children: readonly LensBlock[],
    parentIndex: number | undefined,
  ) {
    for (const block of children) {
      const index = result.length;
      const { children: _, ...own } = block;
      result.push({ block: own, parentIndex });
      visit(block.children, index);
    }
  }

  visit(blocks, undefined);
  return result;
}
