import { blockKey } from "../blocks/json.js";
import { blockToText } from "../blocks/text.js";
import {
  contentShape,
  type FlatBlock,
  type LensBlock,
} from "../blocks/types.js";
import { myersMatch } from "../diff/myers.js";
import { uniquePairs } from "../diff/anchored.js";
import { gaps } from "../diff/gaps.js";
import type { MatchedPair } from "../diff/types.js";
import {
  type Overlap,
  type OverlapText,
  textOverlaps,
  wordSize,
} from "./overlap.js";

/**
 * The minimum part of a text that two blocks must have in common to match by
 * their overlap.
 */
const MIN_SHARE = 0.5;

/**
 * Two blocks that are the same block: `a[aIndex]` and `b[bIndex]`. Unlike a
 * `MatchedPair`, the pairs of moved blocks (rule 2 of {@link alignBlocks})
 * can cross the other pairs. These pairs have `moved: true`.
 */
export type BlockPair = { aIndex: number; bIndex: number; moved?: true };

/**
 * Experimental (see `TextUpdateOptions.experimentalTextMoves`): a part of
 * the text of block `a[aIndex]` that is in block `b[bIndex]`, of the `size`
 * of {@link Overlap}, where the two blocks are not a pair. A split or a join
 * moved the text. One of the two blocks is in a pair with a third block.
 */
export type TextMove = Overlap;

/**
 * Aligns two flat block lists, one to one. The identity of a block follows
 * the location of its text:
 *
 * 1. One word diff of the texts of all blocks finds the overlap of each pair
 *    of blocks (see `textOverlaps`). It aligns the most words, thus a run of
 *    changed blocks stays aligned, also if a block moves past them. Two
 *    blocks match if they prefer each other (see {@link mutualBestPairs}),
 *    and the overlap is at least half of the shorter text. Thus, a block with
 *    equal text matches, and a block with added sentences stays the same
 *    block. A block without words (for example an image or an empty
 *    paragraph) overlaps with a block with an equal key (see
 *    {@link alignmentKey}).
 * 2. A block that moved: of the blocks without a match, two blocks match if
 *    they have an equal key (not an empty text) that no other block without
 *    a match has on either side. Thus, a block that the text moves keeps its
 *    ID. These pairs can cross the other pairs. A block that moved and
 *    changed has no match.
 * 3. If one block on each side stays between two matches of rule 1 (the
 *    moved blocks do not count), the two blocks have the same position. If
 *    their content has the same shape, they match. Thus, a block with fully
 *    new text at the same position stays the same block.
 *
 * An equal text is a stronger sign than a position. Thus, rule 2 comes
 * before rule 3: a moved block does not match a different block at its new
 * position.
 */
export function alignBlocks(
  a: readonly FlatBlock[],
  b: readonly FlatBlock[],
): BlockPair[] {
  return alignBlocksAndMoves(a, b, false).pairs;
}

/**
 * {@link alignBlocks}, and with `withMoves` (experimental, see
 * `TextUpdateOptions.experimentalTextMoves`) the text that a split or a join
 * moved: the other overlaps of rule 1 of a block in a pair, of at least half
 * of the shorter text. Examples are the second part of a split block, and
 * the second block of a join. Such a block is a part of the other block,
 * thus rules 2 and 3 do not give it a pair. With `withMoves`, a split block
 * stays the first part (see {@link mutualBestPairs}).
 */
export function alignBlocksAndMoves(
  a: readonly FlatBlock[],
  b: readonly FlatBlock[],
  withMoves: boolean,
): { pairs: BlockPair[]; moves: TextMove[] } {
  const { pairs: ordered, moves } = mutualBestPairs(a, b, withMoves);
  // The blocks of a move are not blocks without a match.
  const moved = movedPairs(a, b, [...ordered, ...moves]);
  return {
    pairs: [
      ...ordered,
      ...moved,
      ...samePositionPairs(a, b, ordered, [...moved, ...moves]),
    ],
    moves,
  };
}

/** Rule 3 of {@link alignBlocks}: pairs of blocks at the same position. */
function samePositionPairs(
  a: readonly FlatBlock[],
  b: readonly FlatBlock[],
  ordered: readonly MatchedPair[],
  moved: readonly BlockPair[],
): BlockPair[] {
  const movedA = new Set(moved.map((pair) => pair.aIndex));
  const movedB = new Set(moved.map((pair) => pair.bIndex));
  /** The only index in `[start, end)` that is not in `except`, or `undefined`. */
  function onlyIndex(start: number, end: number, except: Set<number>) {
    let only: number | undefined;
    for (let index = start; index < end; index++) {
      if (!except.has(index)) {
        if (only !== undefined) {
          return undefined;
        }
        only = index;
      }
    }
    return only;
  }
  const pairs: BlockPair[] = [];
  for (const gap of gaps(ordered, a.length, b.length)) {
    const aIndex = onlyIndex(gap.aStart, gap.aEnd, movedA);
    const bIndex = onlyIndex(gap.bStart, gap.bEnd, movedB);
    if (
      aIndex !== undefined &&
      bIndex !== undefined &&
      canBeSameBlock(a[aIndex].block, b[bIndex].block)
    ) {
      pairs.push({ aIndex, bIndex });
    }
  }
  return pairs;
}

/** Rule 2 of {@link alignBlocks}: pairs of moved blocks. */
function movedPairs(
  a: readonly FlatBlock[],
  b: readonly FlatBlock[],
  pairs: readonly BlockPair[],
): BlockPair[] {
  const matchedA = new Set(pairs.map((pair) => pair.aIndex));
  const matchedB = new Set(pairs.map((pair) => pair.bIndex));
  /** The key of each block without a match. Blocks with empty text do not count. */
  function keysOf(blocks: readonly FlatBlock[], matched: Set<number>) {
    return blocks.map(({ block }, index) =>
      matched.has(index) ||
      (Array.isArray(block.content) && !blockToText(block).trim())
        ? undefined
        : alignmentKey(block),
    );
  }
  return uniquePairs(keysOf(a, matchedA), keysOf(b, matchedB)).map((pair) => ({
    ...pair,
    moved: true,
  }));
}

/**
 * Links each block of `view` to the part that gave it. `parts` are the view
 * blocks that each source block gives alone, in document order, and `view`
 * is the parse of the text of the full document. Thus, the two lists come
 * from the same blocks. They are different only where the format renders a
 * block differently in the full document (for example as a part of a
 * different block). Returns the part index for each view block, or
 * `undefined`.
 *
 * Blocks with equal keys link first (see {@link alignmentKey}). Between
 * these anchors, if the two sides have the same number of blocks, the blocks
 * link in order, if their content has the same shape.
 *
 * A view block at a different position than its part (a format that renders
 * a block in a different order in the full document than alone) has no
 * link. With a link, the planner would move the source block to the
 * position of the view block, also if the text did not change.
 */
export function linkBlocks(
  parts: readonly FlatBlock[],
  view: readonly FlatBlock[],
): (number | undefined)[] {
  const links: (number | undefined)[] = new Array(view.length);
  const anchors = myersMatch(
    parts.map(({ block }) => alignmentKey(block)),
    view.map(({ block }) => alignmentKey(block)),
    (x, y) => x === y,
  );
  for (const gap of gaps(anchors, parts.length, view.length)) {
    const size = gap.aEnd - gap.aStart;
    for (let i = 0; size === gap.bEnd - gap.bStart && i < size; i++) {
      if (
        canBeSameBlock(parts[gap.aStart + i].block, view[gap.bStart + i].block)
      ) {
        links[gap.bStart + i] = gap.aStart + i;
      }
    }
    if (gap.anchor) {
      links[gap.anchor.bIndex] = gap.anchor.aIndex;
    }
  }
  return links;
}

/**
 * Returns the key that aligns two blocks of the same format (in
 * {@link alignBlocks}). The key of a text block is its text, and the key of a
 * table is its text, with a different prefix. The key of another block is
 * all its fields, for example the URL of an image. Blocks with equal keys
 * are the same block.
 */
export function alignmentKey(block: LensBlock): string {
  const shape = contentShape(block.content);
  return shape === "none"
    ? `block:${blockKey(block)}`
    : `${shape}:${blockToText(block)}`;
}

/**
 * Returns true if two blocks can be the same block, edited in place: their
 * content has the same shape. This is text (inline content or plain
 * content), a table, or no content with the same block type.
 */
export function canBeSameBlock(a: LensBlock, b: LensBlock): boolean {
  const shape = contentShape(a.content);
  return (
    shape === contentShape(b.content) && (shape !== "none" || a.type === b.type)
  );
}

function overlapText(block: LensBlock): OverlapText {
  return { text: blockToText(block), key: alignmentKey(block) };
}

/**
 * Returns the pairs of blocks that prefer each other, if the overlap is at
 * least {@link MIN_SHARE} of the shorter text:
 *
 * - A block of `a` (the view) prefers the block of `b` with the largest
 *   overlap. Thus, a split block stays the part with most of its text. With
 *   `withMoves`, it prefers the first block of `b`: a split block stays the
 *   first part.
 * - A block of `b` (the text) prefers the block of `a` that it covers best:
 *   the largest part of the text of that block. Thus, two joined blocks stay
 *   the first block, because the joined text covers the two blocks fully.
 *
 * On a tie, the earlier block wins. The overlaps come from one diff, thus the
 * pairs do not cross. With `withMoves`, the other overlaps of this size of a
 * block in a pair are the moves (see {@link alignBlocksAndMoves}).
 */
function mutualBestPairs(
  a: readonly FlatBlock[],
  b: readonly FlatBlock[],
  withMoves: boolean,
): { pairs: MatchedPair[]; moves: TextMove[] } {
  const textsA = a.map(({ block }) => overlapText(block));
  const textsB = b.map(({ block }) => overlapText(block));
  const overlaps =
    textsA.length === 0 || textsB.length === 0
      ? []
      : textOverlaps(textsA, textsB);
  const sizesA = textsA.map(wordSize);
  const sizesB = textsB.map(wordSize);
  const large = overlaps
    .filter(
      (overlap) =>
        overlap.size >=
        MIN_SHARE * Math.min(sizesA[overlap.aIndex], sizesB[overlap.bIndex]),
    )
    .sort((x, y) => x.aIndex - y.aIndex || x.bIndex - y.bIndex);
  function coverage(overlap: Overlap) {
    return overlap.size / sizesA[overlap.aIndex];
  }

  const bestOfA = new Map<number, Overlap>();
  const bestOfB = new Map<number, Overlap>();
  for (const overlap of large) {
    const ofA = bestOfA.get(overlap.aIndex);
    if (ofA === undefined || (!withMoves && ofA.size < overlap.size)) {
      bestOfA.set(overlap.aIndex, overlap);
    }
    const ofB = bestOfB.get(overlap.bIndex);
    if (ofB === undefined || coverage(ofB) < coverage(overlap)) {
      bestOfB.set(overlap.bIndex, overlap);
    }
  }

  const mutual = large.filter(
    (overlap) =>
      bestOfA.get(overlap.aIndex) === overlap &&
      bestOfB.get(overlap.bIndex) === overlap,
  );
  return {
    pairs: mutual
      .map(({ aIndex, bIndex }) => ({ aIndex, bIndex }))
      .sort((x, y) => x.aIndex - y.aIndex),
    moves: withMoves ? textMoves(a, b, large, mutual) : [],
  };
}

/** The moves (see {@link alignBlocksAndMoves}): the other large overlaps of text blocks, of a block in a pair. */
function textMoves(
  a: readonly FlatBlock[],
  b: readonly FlatBlock[],
  large: readonly Overlap[],
  pairs: readonly Overlap[],
): TextMove[] {
  const isPair = new Set(pairs);
  const pairedA = new Set(pairs.map((pair) => pair.aIndex));
  const pairedB = new Set(pairs.map((pair) => pair.bIndex));
  return large.filter(
    (overlap) =>
      !isPair.has(overlap) &&
      (pairedA.has(overlap.aIndex) || pairedB.has(overlap.bIndex)) &&
      contentShape(a[overlap.aIndex].block.content) === "text" &&
      contentShape(b[overlap.bIndex].block.content) === "text",
  );
}
