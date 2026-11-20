import {
  type BlockWithoutChildren,
  contentShape,
  type FlatBlock,
} from "../model.js";
import { blockKey, blockToText } from "../util/blocks/index.js";
import {
  anchoredMatch,
  heaviestIncreasing,
  type MatchedPair,
  uniquePairs,
} from "../util/sequence/index.js";
import { type Overlap, textOverlaps, wordSize } from "./overlap.js";

/**
 * The minimum part of a text that two blocks must have in common to be a
 * changed pair: of the shorter text for a pair in order (see
 * {@link changedPairs}), and of the longer text for a moved pair (see
 * {@link skeleton}).
 */
const MIN_SHARE = 0.5;

/**
 * Two blocks that are the same block: `before[aIndex]` and `after[bIndex]`
 * (see {@link alignBlocks}). Unlike a `MatchedPair`, the pairs of moved
 * blocks (see {@link skeleton}) can cross the other pairs. These pairs have
 * `moved: true`.
 */
export type BlockPair = { aIndex: number; bIndex: number; moved?: true };

/**
 * Aligns the blocks of a document before an edit (`before`) with its blocks
 * after the edit (`after`), one to one, in two flat lists. The identity of a
 * block follows the location of its text. The method is not symmetric: it
 * keeps the identity of a block of `before` (see {@link changedPairs}).
 *
 * Equal blocks at the start and at the end match first, as in a line diff.
 * Thus, the time of a small edit does not depend on the size of the
 * document. The blocks between them go through three stages, as in a
 * patience diff: first the pairs that are sure, then the gaps between them.
 *
 * 1. Candidates (see {@link candidates}): the pairs that the text shows.
 *    An equal pair is two blocks with the same key (see
 *    {@link alignmentKey}). A changed pair is two other blocks that share
 *    at least half of the shorter text.
 *
 *        before:  Intro | Old text one | Notes
 *        after:   Notes | Intro | Old text two
 *        equal pairs:  Intro, Notes
 *        changed pair: "Old text one" with "Old text two"
 *
 * 2. Skeleton (see {@link skeleton}): candidates can cross. In the example,
 *    the pair of "Notes" crosses the two other pairs. The candidates that
 *    do not cross and have the largest weight stay in order: they are the
 *    skeleton. The weight of a pair is the number of word characters that
 *    its blocks share. Only this stage uses weights. A candidate that is
 *    not in the skeleton is a moved block: the block keeps its ID. For a
 *    changed pair, the position does not support the pair. Thus, the text
 *    must show more: the two blocks share at least half of the longer text.
 *    If not, it is no pair.
 *
 *        skeleton: Intro, and the changed pair
 *        moved:    Notes
 *
 * 3. Gaps (see {@link pairsInGap}): the skeleton cuts the two lists into
 *    gaps. In each gap, the blocks without a match pair by shared words,
 *    and then by position: one block on each side between two pairs is the
 *    same block, if the content has the same shape. Thus, a block with
 *    fully new text at the same position stays the same block.
 *
 *        before:  Intro | x | Notes | Old
 *        after:   Old | Intro | y | Notes
 *        skeleton: Intro, Notes       moved: Old
 *        gap between Intro and Notes: x and y share no words. They have
 *        the same position, thus they are a pair.
 *
 * The word diff runs in the stages 1 and 3, because it answers two
 * questions. In stage 1, it runs on all blocks: the skeleton needs the
 * changed pairs to decide which blocks moved. But one diff is one
 * alignment in order: a pair that is not in the skeleton had the place of
 * the pairs that it crossed. In stage 3, the diff of a gap finds those.
 *
 * An equal text is a stronger sign than shared words or a position. Thus,
 * if an edit changes a line and adds a line with the old text at a
 * different place, the new line is the block.
 *
 * This is not one published algorithm, but each part uses a known method.
 * The equal pairs in order and the changed pairs come from a diff (the
 * patience method, then Myers, see `anchoredMatch`). A unique equal key is
 * the rule of Heckel (1978) for moved lines: a line that is in each file one
 * time is the same line. A changed pair uses the overlap coefficient: the
 * size of the shared words divided by the size of the shorter text. A moved
 * changed pair uses the size of the longer text, with the same minimum: this
 * is the similarity index of the rename detection of git. The skeleton is a
 * heaviest increasing subsequence. The pair by position is the
 * rule of a line diff that shows one removed line and one added line at the
 * same place as one changed line.
 */
export function alignBlocks(
  before: readonly FlatBlock[],
  after: readonly FlatBlock[],
): BlockPair[] {
  const { start, end } = equalEnds(before, after);
  const middle = alignByStages(
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

/**
 * A pair that the text shows (stage 1 of {@link alignBlocks}). `weight` is
 * the number of word characters that the two blocks share. An equal pair
 * has 1 more: thus, a block without words has a weight, and an equal pair
 * wins from a changed pair with the same shared text. `share` is the part of
 * the longer text that the two blocks share (1 for an equal pair).
 */
type Candidate = MatchedPair & { weight: number; share: number };

/**
 * A part of the two lists: the indexes of its blocks of `before` (`a`) and
 * of `after` (`b`), in order.
 */
type Part = { a: readonly number[]; b: readonly number[] };

/** The three stages of {@link alignBlocks}. */
function alignByStages(
  before: readonly FlatBlock[],
  after: readonly FlatBlock[],
): BlockPair[] {
  const { inOrder, moved } = skeleton(candidates(before, after), after.length);
  const rest = partWithout(before.length, after.length, [...inOrder, ...moved]);
  const inGaps = split(rest, inOrder).flatMap((gap) =>
    pairsInGap(before, after, gap),
  );
  return [
    ...[...inOrder, ...inGaps].sort((x, y) => x.aIndex - y.aIndex),
    ...moved,
  ];
}

/**
 * Stage 1 of {@link alignBlocks}: the pairs that the text shows.
 *
 * - The equal pairs in the same order (see {@link equalPairsInOrder}).
 * - Of the other blocks, the equal pairs with a unique key (see
 *   {@link uniqueEqualPairs}). An equal text is a stronger sign than shared
 *   words. Thus, these pairs come before the changed pairs.
 * - Of the other blocks, the changed pairs (see {@link changedPairs}).
 *
 * No block is in two candidates. The pairs of each kind are in order, but a
 * pair of one kind can cross a pair of a different kind, and the pairs with
 * a unique key can cross each other.
 */
function candidates(
  before: readonly FlatBlock[],
  after: readonly FlatBlock[],
): Candidate[] {
  const inOrder = equalPairsInOrder(before, after);
  const equal = [...inOrder, ...uniqueEqualPairs(before, after, inOrder)];
  const others = partWithout(before.length, after.length, equal);
  return [...equal, ...changedPairs(before, after, others)];
}

/**
 * Stage 2 of {@link alignBlocks}: the candidates that do not cross and have
 * the largest weight stay in order. A candidate that is not in order is a
 * moved block, if its blocks share at least {@link MIN_SHARE} of the longer
 * text. An equal pair always does. A changed pair that shares less is no
 * pair: only its position can show that the two blocks are the same block,
 * and the position is different.
 *
 * Example, with the weight of each candidate:
 *
 *     before:  x | Hello World | y        after:  y | hello world | x
 *     candidates: x (2), "Hello World" (10), y (2)
 *     in order:   "Hello World"       moved: x, y
 *
 * Example of a changed pair that is not in order:
 *
 *     before:  Buy oat milk | Same long text
 *     after:   Same long text | Buy milk
 *     candidates: the changed pair (7), "Same long text" (13)
 *     in order:   "Same long text"
 *     moved:      the changed pair. It shares 7 of the 10 characters of
 *                 "Buy oat milk".
 */
function skeleton(
  candidates: readonly Candidate[],
  afterLength: number,
): { inOrder: MatchedPair[]; moved: BlockPair[] } {
  const sorted = [...candidates].sort((x, y) => x.aIndex - y.aIndex);
  const kept = new Set(
    heaviestIncreasing(sorted, (pair) => pair.weight, afterLength),
  );
  return {
    inOrder: sorted
      .filter((pair) => kept.has(pair))
      .map(({ aIndex, bIndex }) => ({ aIndex, bIndex })),
    moved: sorted
      .filter((pair) => pair.share >= MIN_SHARE && !kept.has(pair))
      .map(({ aIndex, bIndex }) => ({ aIndex, bIndex, moved: true })),
  };
}

/**
 * Stage 3 of {@link alignBlocks}: the pairs of the blocks of one gap. First
 * the changed pairs of the gap. They cut the gap into smaller gaps. Then, in
 * each smaller gap with one block on each side: the two blocks have the same
 * position, and they are a pair if their content has the same shape.
 *
 * Example: the gap has three blocks on each side, and "c d" shares its words:
 *
 *     before:  x | c d | y        after:  p | c d e | q
 *     by shared words: "c d" with "c d e"
 *     by position:     x with p, y with q
 */
function pairsInGap(
  before: readonly FlatBlock[],
  after: readonly FlatBlock[],
  gap: Part,
): MatchedPair[] {
  const byWords = changedPairs(before, after, gap);
  const byPosition = split(gap, byWords).flatMap(({ a, b }) =>
    a.length === 1 &&
    b.length === 1 &&
    canBeSameBlock(before[a[0]].block, after[b[0]].block)
      ? [{ aIndex: a[0], bIndex: b[0] }]
      : [],
  );
  return [...byWords, ...byPosition];
}

/** The part with all blocks that are not in `pairs`. */
function partWithout(
  beforeLength: number,
  afterLength: number,
  pairs: readonly MatchedPair[],
): Part {
  const inA = new Set(pairs.map((pair) => pair.aIndex));
  const inB = new Set(pairs.map((pair) => pair.bIndex));
  return {
    a: indexes(0, beforeLength).filter((i) => !inA.has(i)),
    b: indexes(0, afterLength).filter((j) => !inB.has(j)),
  };
}

/**
 * Cuts a part at pairs that are in order: returns the parts before, between
 * and after the pairs. The blocks of the pairs are in no part.
 *
 * Example: the pair (2, 1) cuts the part `a: 0 1 2 3`, `b: 0 1 2` into
 * `a: 0 1`, `b: 0` and `a: 3`, `b: 2`.
 */
function split(part: Part, pairs: readonly MatchedPair[]): Part[] {
  /** The indexes of `list` before, between and after the cuts. */
  function ranges(list: readonly number[], cuts: readonly number[]) {
    const result: number[][] = [[], ...cuts.map(() => [])];
    let range = 0;
    for (const index of list) {
      while (range < cuts.length && cuts[range] < index) {
        range++;
      }
      if (cuts[range] !== index) {
        result[range].push(index);
      }
    }
    return result;
  }
  const a = ranges(
    part.a,
    pairs.map((pair) => pair.aIndex),
  );
  const b = ranges(
    part.b,
    pairs.map((pair) => pair.bIndex),
  );
  return a.map((list, k) => ({ a: list, b: b[k] }));
}

/** The numbers from `start` to `end - 1`. */
function indexes(start: number, end: number): number[] {
  return Array.from({ length: end - start }, (_, i) => start + i);
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

/** The weight of an equal pair of `block` (see {@link Candidate}). */
function equalWeight(block: BlockWithoutChildren): number {
  return 1 + wordSize(blockToText(block));
}

/**
 * The pairs of blocks with equal keys that are in the same order in
 * `before` and in `after`, also for a key that is not unique, and for a
 * block without words (for example an image or an empty paragraph). This is
 * a diff of the keys (`anchoredMatch`): it finds the largest number of
 * these pairs, and they do not cross. The diff has no weights: the skeleton
 * decides which equal blocks stay in order.
 *
 * Only a block whose key is in the two lists can have a pair. Thus, the diff
 * gets only these blocks: a diff of lists with nothing in common would use
 * its full work limit.
 *
 * Example, with the keys of the blocks:
 *
 *     before:  x | y | x        after:  n | x | x | y
 *     pairs:   (0, 1) (2, 2)    The two "x" are in order, and "y" is not.
 */
function equalPairsInOrder(
  before: readonly FlatBlock[],
  after: readonly FlatBlock[],
): Candidate[] {
  const keysBefore = before.map(({ block }) => alignmentKey(block));
  const keysAfter = after.map(({ block }) => alignmentKey(block));
  /** The keys that are in `other`, each with its index. */
  function withKeyIn(keys: readonly string[], other: ReadonlySet<string>) {
    return keys.flatMap((key, index) =>
      other.has(key) ? [{ index, key }] : [],
    );
  }
  const a = withKeyIn(keysBefore, new Set(keysAfter));
  const b = withKeyIn(keysAfter, new Set(keysBefore));
  return anchoredMatch(a, b, (item) => item.key).map((pair) => {
    const aIndex = a[pair.aIndex].index;
    return {
      aIndex,
      bIndex: b[pair.bIndex].index,
      weight: equalWeight(before[aIndex].block),
      share: 1,
    };
  });
}

/**
 * Of the blocks that are not in `matched`: the pairs of blocks with an equal
 * key (not an empty text) that no other of these blocks has, on either
 * side. These pairs can cross each other.
 *
 * Example, after the example of {@link equalPairsInOrder}: "y" is one time
 * on each side, thus (1, 3) is a pair.
 */
function uniqueEqualPairs(
  before: readonly FlatBlock[],
  after: readonly FlatBlock[],
  matched: readonly MatchedPair[],
): Candidate[] {
  const matchedBefore = new Set(matched.map((pair) => pair.aIndex));
  const matchedAfter = new Set(matched.map((pair) => pair.bIndex));
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
    weight: equalWeight(before[pair.aIndex].block),
    share: 1,
  }));
}

/**
 * The changed pairs of the blocks of `part` (the stages 1 and 3 of
 * {@link alignBlocks}): one word diff of their texts finds the overlap of
 * each pair of blocks (see `textOverlaps`). Two blocks are a pair if they
 * prefer each other, and the overlap is at least {@link MIN_SHARE} of the
 * shorter text:
 *
 * - A block of `before` prefers the block of `after` with the largest
 *   overlap. Thus, a split block stays the part with most of its text.
 * - A block of `after` prefers the block of `before` that it covers best:
 *   the largest part of the text of that block. Thus, two joined blocks stay
 *   the first block, because the joined text covers the two blocks fully.
 *
 * On a tie, the earlier block wins. The overlaps come from one diff, thus the
 * pairs do not cross, and they are in order.
 *
 * Example: "a b c d" is split, and "c d" gets a word.
 *
 *     before:  a b c d            after:  a b | c d e
 *     overlaps: "a b" (2 words), "c d e" (2 words)
 *     pair:     "a b c d" with "a b" (a tie: the earlier block wins)
 *
 * The time is the time of the word diff. The other steps use only the pairs
 * of blocks with shared words. Because the diff does not cross, there are at
 * most as many of these pairs as the part has blocks.
 */
function changedPairs(
  before: readonly FlatBlock[],
  after: readonly FlatBlock[],
  part: Part,
): Candidate[] {
  if (part.a.length === 0 || part.b.length === 0) {
    return [];
  }
  const textsBefore = part.a.map((i) => blockToText(before[i].block));
  const textsAfter = part.b.map((j) => blockToText(after[j].block));
  const overlaps = textOverlaps(textsBefore, textsAfter);
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
    .map((overlap) => ({
      aIndex: part.a[overlap.aIndex],
      bIndex: part.b[overlap.bIndex],
      weight: overlap.size,
      share:
        overlap.size /
        Math.max(sizesBefore[overlap.aIndex], sizesAfter[overlap.bIndex]),
    }));
}
