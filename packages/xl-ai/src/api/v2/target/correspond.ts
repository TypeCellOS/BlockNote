import type { BlockWithoutChildren, FlatBlock, LensBlock } from "../model.js";
import { blockToText, type BlockIndex } from "../util/blocks/index.js";
import type { BlockPair } from "../alignment/index.js";
import type { Projection } from "../projection/index.js";

/**
 * What the target stage does with one block of the text (a row).
 *
 * @internal
 */
export type TextRow =
  /**
   * The text block is a source block that stays (`id`), and its pair is the
   * view block `viewIndex`. Its fields merge three-way (see
   * `targetFromPairs`).
   */
  | {
      kind: "kept";
      id: string;
      viewIndex: number;
      /** The text moved the block (rule 2 of `alignBlocks`). */
      moved: boolean;
    }
  /** A new block. It gets a new ID. */
  | { kind: "new" };

/**
 * The correspondence of the text blocks and the source blocks.
 *
 * @internal
 */
export type Correspondence = {
  /** One row for each block of the text, in the order of the text. */
  rows: TextRow[];
  /**
   * The source blocks that stay: the source blocks of the kept rows, and
   * the invisible blocks that stay (see {@link withInvisibleBlocks}).
   */
  kept: Set<string>;
};

/**
 * Finds what the target stage does with each block of the text: which source block
 * it is, if it is one (see {@link TextRow}). Also finds the source blocks
 * that stay.
 *
 * - A source block with a pair in the text stays. Each source block has one
 *   view block at most (see `projectDocument`).
 * - An invisible block stays, with some exceptions (see
 *   {@link withInvisibleBlocks}).
 *
 * Method: our own design.
 *
 * @internal
 */
export function correspond(
  input: {
    projection: Projection;
    /** The blocks of the text, in a flat list. */
    incoming: readonly FlatBlock[];
    /** The pairs of `projection.view` (a side) and `incoming` (b side). */
    alignment: readonly BlockPair[];
  },
  source: BlockIndex,
): Correspondence {
  const { view, invisibleIds } = input.projection;
  const { incoming } = input;
  /** The text block of each view block, and the view block of each text block. */
  const textIndexOf: (number | undefined)[] = new Array(view.length);
  const viewIndexOf: (number | undefined)[] = new Array(incoming.length);
  const moved = new Set<number>();
  for (const pair of input.alignment) {
    textIndexOf[pair.aIndex] = pair.bIndex;
    viewIndexOf[pair.bIndex] = pair.aIndex;
    if (pair.moved) {
      moved.add(pair.bIndex);
    }
  }

  /** The row of text block `j`. */
  function rowOf(j: number): TextRow {
    const v = viewIndexOf[j];
    if (v === undefined) {
      return { kind: "new" };
    }
    return {
      kind: "kept",
      id: view[v].sourceId,
      viewIndex: v,
      moved: moved.has(j),
    };
  }

  const rows = incoming.map((_, j) => rowOf(j));
  const keptIds = rows.flatMap((row) => (row.kind === "kept" ? [row.id] : []));
  return {
    rows,
    kept: withInvisibleBlocks(source, invisibleIds, keptIds),
  };
}

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
 */
function withInvisibleBlocks(
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
  if (!isEmptyBlock(source.block(id)) || hasKeptDescendant(source, kept, id)) {
    return true;
  }
  if (neighbors.length > 0) {
    return neighbors.some((neighbor) => kept.has(neighbor));
  }
  return source.parent(id) !== undefined || topHasContent;
}

/** Returns true if a block in the block (at any depth) stays. */
function hasKeptDescendant(
  source: BlockIndex,
  kept: ReadonlySet<string>,
  id: string,
): boolean {
  return source
    .childrenOf(id)
    .some((child) => kept.has(child) || hasKeptDescendant(source, kept, child));
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
  return isEmptyTextBlock(block) && block.children.length === 0;
}

/** Returns true for a block with inline content and no text. */
function isEmptyTextBlock(block: BlockWithoutChildren): boolean {
  return Array.isArray(block.content) && blockToText(block) === "";
}
