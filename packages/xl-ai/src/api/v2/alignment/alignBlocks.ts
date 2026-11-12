import {
  type BlockWithoutChildren,
  contentShape,
  type FlatBlock,
} from "../model.js";
import { blockKey, blockToText } from "../util/blocks/index.js";
import { gaps, type MatchedPair, uniquePairs } from "../util/sequence/index.js";
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
 * Two blocks that are the same block: `before[aIndex]` and `after[bIndex]`
 * (see {@link alignBlocks}). Unlike a
 * `MatchedPair`, the pairs of moved blocks (rule 2 of {@link alignBlocks})
 * can cross the other pairs. These pairs have `moved: true`.
 */
export type BlockPair = { aIndex: number; bIndex: number; moved?: true };

/**
 * Aligns the blocks of a document before an edit (`before`) with its blocks
 * after the edit (`after`), one to one, in two flat lists. The identity of a
 * block follows the location of its text. The rules are not symmetric: they
 * keep the identity of a block of `before` (see {@link overlapPairs}).
 *
 * Equal blocks at the start and at the end match first, as in a line diff.
 * Thus, the time of a small edit does not depend on the size of the
 * document. The rules apply to the blocks between them:
 *
 * 1. One word diff of the texts of all blocks finds the overlap of each pair
 *    of blocks (see `textOverlaps`). It aligns the most words, thus a run of
 *    changed blocks stays aligned, also if a block moves past them. Two
 *    blocks match if they prefer each other (see {@link overlapPairs}),
 *    and the overlap is at least half of the shorter text. Thus, a block with
 *    equal text matches, and a block with added sentences stays the same
 *    block. A block without words (for example an image or an empty
 *    paragraph) overlaps with a block with an equal key (see
 *    {@link alignmentKey}).
 * 2. A block that moved: of the blocks without a match, two blocks match if
 *    they have an equal key (not an empty text) that no other block without
 *    a match has on either side. Thus, a block that the edit moves keeps its
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
 *
 * Known limit: rule 1 comes before rule 2. Thus, two blocks that swap places
 * match by position if unchanged blocks are between them and they share at
 * least half of the shorter text (see the README, "Identity").
 *
 * This is not one published algorithm, but each rule uses a known method.
 * Rule 1 uses a word diff (the patience method, then Myers, see
 * `anchoredMatch`) and the overlap coefficient: the size of the shared words
 * divided by the size of the shorter text. Rule 2 is the rule of Heckel
 * (1978) for moved lines: a line that is in each file one time is the same
 * line. Rule 3 is the rule of a line diff that shows one removed line and one
 * added line at the same place as one changed line.
 */
export function alignBlocks(
  before: readonly FlatBlock[],
  after: readonly FlatBlock[],
): BlockPair[] {
  const { start, end } = equalEnds(before, after);
  const middle = alignByRules(
    before.slice(start, before.length - end),
    after.slice(start, after.length - end),
  );
  return [
    ...indexes(0, start).map((i) => ({ aIndex: i, bIndex: i })),
    ...middle.map((pair) => ({
      ...pair,
      aIndex: start + pair.aIndex,
      bIndex: start + pair.bIndex,
    })),
    ...indexes(0, end).map((i) => ({
      aIndex: before.length - end + i,
      bIndex: after.length - end + i,
    })),
  ];
}

/**
 * Returns the key that aligns two blocks of the same format (in
 * {@link alignBlocks}). The key of a text block is its text, and the key of a
 * table is its text, with a different prefix. The key of another block is
 * all its fields, for example the URL of an image. Blocks with equal keys
 * are the same block.
 */
export function alignmentKey(block: BlockWithoutChildren): string {
  const shape = contentShape(block.content);
  return shape === "none"
    ? `block:${blockKey(block)}`
    : `${shape}:${blockToText(block)}`;
}

/**
 * Returns true if two blocks can be the same block, edited in place: their
 * content has the same shape. This is text (inline content or plain
 * content), a table, or no content with the same block type.
 *
 * @internal
 */
export function canBeSameBlock(
  a: BlockWithoutChildren,
  b: BlockWithoutChildren,
): boolean {
  const shape = contentShape(a.content);
  return (
    shape === contentShape(b.content) && (shape !== "none" || a.type === b.type)
  );
}

/** The rules 1 to 3 of {@link alignBlocks}. */
function alignByRules(
  before: readonly FlatBlock[],
  after: readonly FlatBlock[],
): BlockPair[] {
  const overlapping = overlapPairs(before, after);
  const moved = movedPairs(before, after, overlapping);
  const samePosition = samePositionPairs(before, after, overlapping, moved);
  return [...overlapping, ...moved, ...samePosition];
}

/**
 * The number of blocks with equal keys (see {@link alignmentKey}) at the
 * start of the two lists, and at their end (without the blocks of the start).
 */
function equalEnds(
  before: readonly FlatBlock[],
  after: readonly FlatBlock[],
): { start: number; end: number } {
  function equal(i: number, j: number) {
    return alignmentKey(before[i].block) === alignmentKey(after[j].block);
  }
  let start = 0;
  while (start < before.length && start < after.length && equal(start, start)) {
    start++;
  }
  let end = 0;
  while (
    end < before.length - start &&
    end < after.length - start &&
    equal(before.length - 1 - end, after.length - 1 - end)
  ) {
    end++;
  }
  return { start, end };
}

/**
 * Rule 3 of {@link alignBlocks}: pairs of blocks at the same position.
 *
 * The pairs of rule 1 do not cross. Thus, they cut the two lists into gaps
 * (see `gaps`): the blocks between two pairs of rule 1. The pairs of rule 2
 * can cross, thus they do not cut the lists. A block of a pair of rule 2 is
 * in a gap, but it has a match already. If a gap has one block without a
 * match on each side, the two blocks are at the same position. In this
 * example, P and Q match by rule 1, and m moved (rule 2). Thus, x and y are
 * at the same position:
 *
 *     before:  P  x m  Q
 *     after:   P  y    Q  m
 */
function samePositionPairs(
  before: readonly FlatBlock[],
  after: readonly FlatBlock[],
  overlapping: readonly MatchedPair[],
  moved: readonly BlockPair[],
): BlockPair[] {
  const movedBefore = new Set(moved.map((pair) => pair.aIndex));
  const movedAfter = new Set(moved.map((pair) => pair.bIndex));
  const pairs: BlockPair[] = [];
  for (const gap of gaps(overlapping, before.length, after.length)) {
    const restBefore = indexes(gap.aStart, gap.aEnd).filter(
      (i) => !movedBefore.has(i),
    );
    const restAfter = indexes(gap.bStart, gap.bEnd).filter(
      (i) => !movedAfter.has(i),
    );
    if (
      restBefore.length === 1 &&
      restAfter.length === 1 &&
      canBeSameBlock(before[restBefore[0]].block, after[restAfter[0]].block)
    ) {
      pairs.push({ aIndex: restBefore[0], bIndex: restAfter[0] });
    }
  }
  return pairs;
}

/** The numbers from `start` to `end - 1`. */
function indexes(start: number, end: number): number[] {
  return Array.from({ length: end - start }, (_, i) => start + i);
}

/** Rule 2 of {@link alignBlocks}: pairs of moved blocks. */
function movedPairs(
  before: readonly FlatBlock[],
  after: readonly FlatBlock[],
  pairs: readonly BlockPair[],
): BlockPair[] {
  const matchedBefore = new Set(pairs.map((pair) => pair.aIndex));
  const matchedAfter = new Set(pairs.map((pair) => pair.bIndex));
  /** The key of each block without a match. Blocks with empty text do not count. */
  function keysOf(blocks: readonly FlatBlock[], matched: Set<number>) {
    return blocks.map(({ block }, index) =>
      matched.has(index) ||
      (Array.isArray(block.content) && !blockToText(block).trim())
        ? undefined
        : alignmentKey(block),
    );
  }
  return uniquePairs(
    keysOf(before, matchedBefore),
    keysOf(after, matchedAfter),
  ).map((pair) => ({
    ...pair,
    moved: true,
  }));
}

function overlapText(block: BlockWithoutChildren): OverlapText {
  return { text: blockToText(block), key: alignmentKey(block) };
}

/**
 * Rule 1 of {@link alignBlocks}: returns the pairs of blocks that prefer each
 * other, if the overlap is at least {@link MIN_SHARE} of the shorter text:
 *
 * - A block of `before` prefers the block of `after` with the largest
 *   overlap. Thus, a split block stays the part with most of its text.
 * - A block of `after` prefers the block of `before` that it covers best:
 *   the largest part of the text of that block. Thus, two joined blocks stay
 *   the first block, because the joined text covers the two blocks fully.
 *
 * On a tie, the earlier block wins. The overlaps come from one diff, thus the
 * pairs do not cross.
 *
 * The time is the time of the word diff (`textOverlaps`). The other steps
 * use only the pairs of blocks with shared words. Because the diff does not
 * cross, there are at most `before.length + after.length` of these pairs.
 */
function overlapPairs(
  before: readonly FlatBlock[],
  after: readonly FlatBlock[],
): MatchedPair[] {
  const textsBefore = before.map(({ block }) => overlapText(block));
  const textsAfter = after.map(({ block }) => overlapText(block));
  const overlaps =
    textsBefore.length === 0 || textsAfter.length === 0
      ? []
      : textOverlaps(textsBefore, textsAfter);
  const sizesBefore = textsBefore.map(wordSize);
  const sizesAfter = textsAfter.map(wordSize);
  const large = overlaps
    .filter(
      (overlap) =>
        overlap.size >=
        MIN_SHARE *
          Math.min(sizesBefore[overlap.aIndex], sizesAfter[overlap.bIndex]),
    )
    .sort((x, y) => x.aIndex - y.aIndex || x.bIndex - y.bIndex);
  function coverage(overlap: Overlap) {
    return overlap.size / sizesBefore[overlap.aIndex];
  }

  const bestOfBefore = new Map<number, Overlap>();
  const bestOfAfter = new Map<number, Overlap>();
  for (const overlap of large) {
    const ofBefore = bestOfBefore.get(overlap.aIndex);
    if (ofBefore === undefined || ofBefore.size < overlap.size) {
      bestOfBefore.set(overlap.aIndex, overlap);
    }
    const ofAfter = bestOfAfter.get(overlap.bIndex);
    if (ofAfter === undefined || coverage(ofAfter) < coverage(overlap)) {
      bestOfAfter.set(overlap.bIndex, overlap);
    }
  }

  return large
    .filter(
      (overlap) =>
        bestOfBefore.get(overlap.aIndex) === overlap &&
        bestOfAfter.get(overlap.bIndex) === overlap,
    )
    .map(({ aIndex, bIndex }) => ({ aIndex, bIndex }))
    .sort((x, y) => x.aIndex - y.aIndex);
}
