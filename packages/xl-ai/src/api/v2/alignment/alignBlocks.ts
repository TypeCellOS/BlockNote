import { blockToText } from "../blocks/text.js";
import {
  type FlatBlock,
  isTableContent,
  type LensBlock,
} from "../blocks/types.js";
import { myersMatch } from "../diff/myers.js";
import type { MatchedPair } from "../diff/types.js";
import { type Overlap, textOverlaps, wordSize } from "./overlap.js";

/**
 * The minimum part of a text that two blocks must have in common to match by
 * their overlap.
 */
const MIN_SHARE = 0.5;

/**
 * Aligns two flat block lists, one to one. The matched pairs do not cross.
 * The identity of a block follows the location of its text:
 *
 * 1. Blocks with equal text match first (see {@link alignmentKey}), with a
 *    longest common subsequence.
 * 2. Between these anchors, two blocks match if each block has its largest
 *    overlap with the other, and the overlap is at least half of the shorter
 *    text. Thus, a block with added sentences stays the same block.
 * 3. If one block on each side stays between two matches, the two blocks have
 *    the same position. If their content has the same shape, they match.
 *    Thus, a block with fully new text at the same position stays the same
 *    block.
 *
 * The alignment does not find moved blocks. A block that moved across other
 * blocks has no match.
 */
export function alignBlocks(
  a: readonly FlatBlock[],
  b: readonly FlatBlock[],
): MatchedPair[] {
  const pairs: MatchedPair[] = [];
  for (const { gap, anchor } of gaps(anchorsOf(a, b), a.length, b.length)) {
    const inGap = mutualBestPairs(gapTexts(a, b, gap)).map((pair) => ({
      aIndex: gap.aStart + pair.aIndex,
      bIndex: gap.bStart + pair.bIndex,
    }));
    for (const sub of gaps(inGap, gap.aEnd, gap.bEnd, gap)) {
      if (
        sub.gap.aEnd - sub.gap.aStart === 1 &&
        sub.gap.bEnd - sub.gap.bStart === 1 &&
        canBeSameBlock(a[sub.gap.aStart].block, b[sub.gap.bStart].block)
      ) {
        pairs.push({ aIndex: sub.gap.aStart, bIndex: sub.gap.bStart });
      }
      if (sub.anchor) {
        pairs.push(sub.anchor);
      }
    }
    if (anchor) {
      pairs.push(anchor);
    }
  }
  return pairs;
}

/**
 * Links each block of `view` to the block of `source` that gave it. `view`
 * comes from a round trip of `source` through a text format. Returns the
 * source index for each view block, or `undefined`.
 *
 * Blocks with equal text link first. Between these anchors, a view block
 * links to the source block that has the largest overlap with it, if the
 * overlap is at least half of the view block text. More than one view block
 * can link to one source block. An example is a code block with a blank line,
 * which gives two paragraphs in plain text.
 */
export function linkBlocks(
  source: readonly FlatBlock[],
  view: readonly FlatBlock[],
): (number | undefined)[] {
  const links: (number | undefined)[] = new Array(view.length);
  for (const { gap, anchor } of gaps(
    anchorsOf(source, view),
    source.length,
    view.length,
  )) {
    const { overlaps, sizesB } = gapTexts(source, view, gap);
    const best = new Map<number, Overlap>();
    for (const overlap of overlaps) {
      const current = best.get(overlap.bIndex);
      if (
        overlap.size >= MIN_SHARE * sizesB[overlap.bIndex] &&
        (current === undefined || overlap.size > current.size)
      ) {
        best.set(overlap.bIndex, overlap);
      }
    }
    for (const [viewIndex, overlap] of best) {
      links[gap.bStart + viewIndex] = gap.aStart + overlap.aIndex;
    }
    if (anchor) {
      links[anchor.bIndex] = anchor.aIndex;
    }
  }
  return links;
}

/**
 * Returns the key that aligns a block: its text, or its type for a block that
 * cannot have text (for example an image).
 */
export function alignmentKey(block: LensBlock): string {
  const text = blockToText(block);
  return Array.isArray(block.content) || text.length > 0
    ? `text:${text}`
    : `type:${block.type}`;
}

/**
 * Returns true if two blocks can be the same block, edited in place: their
 * content has the same shape. This is text (inline content or plain
 * content), a table, or no content with the same block type.
 */
export function canBeSameBlock(a: LensBlock, b: LensBlock): boolean {
  if (Array.isArray(a.content) || Array.isArray(b.content)) {
    return Array.isArray(a.content) && Array.isArray(b.content);
  }
  if (isTableContent(a.content) || isTableContent(b.content)) {
    return isTableContent(a.content) && isTableContent(b.content);
  }
  return a.type === b.type;
}

function anchorsOf(a: readonly FlatBlock[], b: readonly FlatBlock[]) {
  return myersMatch(
    a.map((flat) => alignmentKey(flat.block)),
    b.map((flat) => alignmentKey(flat.block)),
    (x, y) => x === y,
  );
}

/** The blocks between two matched pairs: `a[aStart, aEnd)` and `b[bStart, bEnd)`. */
type Gap = { aStart: number; aEnd: number; bStart: number; bEnd: number };

/**
 * Returns the gaps before, between and after the pairs, in a range of the two
 * lists. `anchor` is the pair after the gap, or `undefined` for the last gap.
 */
function gaps(
  pairs: readonly MatchedPair[],
  aEnd: number,
  bEnd: number,
  start: { aStart: number; bStart: number } = { aStart: 0, bStart: 0 },
): { gap: Gap; anchor: MatchedPair | undefined }[] {
  const result: { gap: Gap; anchor: MatchedPair | undefined }[] = [];
  let { aStart, bStart } = start;
  for (const pair of pairs) {
    result.push({
      gap: { aStart, aEnd: pair.aIndex, bStart, bEnd: pair.bIndex },
      anchor: pair,
    });
    aStart = pair.aIndex + 1;
    bStart = pair.bIndex + 1;
  }
  result.push({ gap: { aStart, aEnd, bStart, bEnd }, anchor: undefined });
  return result;
}

/**
 * Returns the overlaps of the blocks in a gap, and the word size of the text
 * of each block. The indices are relative to the start of the gap.
 */
function gapTexts(
  a: readonly FlatBlock[],
  b: readonly FlatBlock[],
  { aStart, aEnd, bStart, bEnd }: Gap,
) {
  const textsA = a.slice(aStart, aEnd).map((flat) => blockToText(flat.block));
  const textsB = b.slice(bStart, bEnd).map((flat) => blockToText(flat.block));
  return {
    overlaps:
      textsA.length === 0 || textsB.length === 0
        ? []
        : textOverlaps(textsA, textsB),
    sizesA: textsA.map(wordSize),
    sizesB: textsB.map(wordSize),
  };
}

/**
 * Returns the pairs where each block has its largest overlap with the other
 * block, and the overlap is at least {@link MIN_SHARE} of the shorter text.
 * On a tie, the earlier block wins. The overlaps come from one diff, thus the
 * pairs do not cross.
 */
function mutualBestPairs({
  overlaps,
  sizesA,
  sizesB,
}: ReturnType<typeof gapTexts>): MatchedPair[] {
  const large = overlaps.filter(
    (overlap) =>
      overlap.size >=
      MIN_SHARE * Math.min(sizesA[overlap.aIndex], sizesB[overlap.bIndex]),
  );

  const bestOfA = new Map<number, Overlap>();
  const bestOfB = new Map<number, Overlap>();
  for (const overlap of large) {
    if ((bestOfA.get(overlap.aIndex)?.size ?? 0) < overlap.size) {
      bestOfA.set(overlap.aIndex, overlap);
    }
    if ((bestOfB.get(overlap.bIndex)?.size ?? 0) < overlap.size) {
      bestOfB.set(overlap.bIndex, overlap);
    }
  }

  return large
    .filter(
      (overlap) =>
        bestOfA.get(overlap.aIndex) === overlap &&
        bestOfB.get(overlap.bIndex) === overlap,
    )
    .map(({ aIndex, bIndex }) => ({ aIndex, bIndex }))
    .sort((x, y) => x.aIndex - y.aIndex);
}
