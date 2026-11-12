import type { LensBlock } from "../model.js";
import { blockToText, type BlockIndex } from "../util/blocks/index.js";

/**
 * Returns the kept blocks (`keptIds`) and the source blocks without a view
 * block that stay. The text cannot remove these blocks, thus they stay.
 * There are two exceptions:
 *
 * - The target stage removes their parent.
 * - An empty block (for example an empty paragraph) goes if the target stage
 *   removes all the visible blocks around it. An example is an empty
 *   paragraph between two removed paragraphs. In a document with only empty
 *   blocks at the top level (for example a new editor), these blocks go:
 *   the text gives all blocks. A hidden block with data
 *   (for example a table in plain text) stays, because the text cannot show
 *   it.
 *
 * Method: our own design.
 *
 * @internal
 */
export function withInvisibleBlocks(
  source: BlockIndex,
  invisibleIds: ReadonlySet<string>,
  keptIds: readonly string[],
): Set<string> {
  const kept = new Set(keptIds);
  const neighborsOf = visibleNeighbors(source, invisibleIds);
  // A document with only empty blocks at the top level (for example a new
  // editor) has no content that the text did not give.
  const topHasContent = source
    .childrenOf(undefined)
    .some((id) => !isEmptyBlock(source.block(id)));
  // In document order. Thus, the decision for the parent of a block comes first.
  for (const id of source.ids) {
    const parentId = source.parent(id);
    if (
      invisibleIds.has(id) &&
      (parentId === undefined || kept.has(parentId)) &&
      invisibleBlockStays(
        source,
        kept,
        id,
        neighborsOf.get(id) ?? [],
        topHasContent,
      )
    ) {
      kept.add(id);
    }
  }
  return kept;
}

/**
 * Returns true if an invisible block in a kept parent (or at the top level)
 * stays (see {@link withInvisibleBlocks}):
 *
 * - A block with data stays: the text cannot show it.
 * - An empty block stays next to a visible block that stays, and goes if the
 *   target stage removes all the visible blocks around it.
 * - An empty block without visible siblings stays in a kept parent, and at
 *   a top level with other content (for example next to column lists that
 *   the format does not show).
 */
function invisibleBlockStays(
  source: BlockIndex,
  kept: ReadonlySet<string>,
  id: string,
  neighbors: readonly string[],
  topHasContent: boolean,
): boolean {
  if (!isEmptyBlock(source.block(id))) {
    return true;
  }
  if (neighbors.length > 0) {
    return neighbors.some((neighbor) => kept.has(neighbor));
  }
  return source.parent(id) !== undefined || topHasContent;
}

/**
 * The nearest visible sibling before and after each block. One pass for
 * each list of siblings, thus the time is linear.
 */
function visibleNeighbors(
  source: BlockIndex,
  invisibleIds: ReadonlySet<string>,
): Map<string, string[]> {
  const neighborsOf = new Map<string, string[]>();
  for (const parentId of [undefined, ...source.ids]) {
    const siblings = source.childrenOf(parentId);
    const before: (string | undefined)[] = [];
    let previous: string | undefined;
    for (const id of siblings) {
      before.push(previous);
      if (!invisibleIds.has(id)) {
        previous = id;
      }
    }
    let next: string | undefined;
    for (let i = siblings.length - 1; i >= 0; i--) {
      neighborsOf.set(
        siblings[i],
        [before[i], next].filter((neighbor) => neighbor !== undefined),
      );
      if (!invisibleIds.has(siblings[i])) {
        next = siblings[i];
      }
    }
  }
  return neighborsOf;
}

/** Returns true for a block with inline content, without text and without children. */
function isEmptyBlock(block: LensBlock): boolean {
  return (
    Array.isArray(block.content) &&
    blockToText(block) === "" &&
    block.children.length === 0
  );
}
