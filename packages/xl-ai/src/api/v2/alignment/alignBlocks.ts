import { blockKey } from "../blocks/json.js";
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
 * Two blocks that are the same block: `a[aIndex]` and `b[bIndex]`. Unlike a
 * `MatchedPair`, the pairs of moved blocks (rule 3 of {@link alignBlocks})
 * can cross the other pairs.
 */
export type BlockPair = { aIndex: number; bIndex: number };

/**
 * Aligns two flat block lists, one to one. The identity of a block follows
 * the location of its text:
 *
 * 1. Blocks with equal text match first (see {@link alignmentKey}), with a
 *    longest common subsequence.
 * 2. Between these anchors, two blocks match if they prefer each other (see
 *    {@link mutualBestPairs}), and the overlap is at least half of the
 *    shorter text. Thus, a block with added sentences stays the same block.
 * 3. A block that moved: of the blocks without a match, two blocks match if
 *    they have an equal key (not an empty text) that no other block without
 *    a match has on either side. Thus, a block that the text moves keeps its
 *    ID. These pairs can cross the other pairs. A block that moved and
 *    changed has no match.
 * 4. If one block on each side stays between two matches of rules 1 and 2
 *    (the moved blocks do not count), the two blocks have the same position.
 *    If their content has the same shape, they match. Thus, a block with
 *    fully new text at the same position stays the same block.
 *
 * An equal text is a stronger sign than a position. Thus, rule 3 comes
 * before rule 4: a moved block does not match a different block at its new
 * position.
 */
export function alignBlocks(
  a: readonly FlatBlock[],
  b: readonly FlatBlock[],
): BlockPair[] {
  // Rules 1 and 2. These pairs are in order.
  const ordered: MatchedPair[] = [];
  for (const { gap, anchor } of gaps(
    anchorsOf(a, b, alignmentKey),
    a.length,
    b.length,
  )) {
    for (const pair of mutualBestPairs(gapTexts(a, b, gap))) {
      ordered.push({
        aIndex: gap.aStart + pair.aIndex,
        bIndex: gap.bStart + pair.bIndex,
      });
    }
    if (anchor) {
      ordered.push(anchor);
    }
  }
  const moved = movedPairs(a, b, ordered);
  return [...ordered, ...moved, ...samePositionPairs(a, b, ordered, moved)];
}

/** Rule 4 of {@link alignBlocks}: pairs of blocks at the same position. */
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
  for (const { gap } of gaps(ordered, a.length, b.length)) {
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

/** Rule 3 of {@link alignBlocks}: pairs of moved blocks. */
function movedPairs(
  a: readonly FlatBlock[],
  b: readonly FlatBlock[],
  pairs: readonly BlockPair[],
): BlockPair[] {
  const matchedA = new Set(pairs.map((pair) => pair.aIndex));
  const matchedB = new Set(pairs.map((pair) => pair.bIndex));
  /** The index of each unique key of a block without a match. Blocks with empty text do not count. */
  function uniqueKeys(blocks: readonly FlatBlock[], matched: Set<number>) {
    const indexes = new Map<string, number | undefined>();
    blocks.forEach(({ block }, index) => {
      const emptyText =
        Array.isArray(block.content) && !blockToText(block).trim();
      if (!matched.has(index) && !emptyText) {
        const key = alignmentKey(block);
        // A second block with the same key makes the key not unique.
        indexes.set(key, indexes.has(key) ? undefined : index);
      }
    });
    return indexes;
  }
  const keysB = uniqueKeys(b, matchedB);
  const moved: BlockPair[] = [];
  for (const [key, aIndex] of uniqueKeys(a, matchedA)) {
    const bIndex = keysB.get(key);
    if (aIndex !== undefined && bIndex !== undefined) {
      moved.push({ aIndex, bIndex });
    }
  }
  return moved;
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
 *
 * A view block at a different position than its source block (for example a
 * nested list that the HTML of a toggle block shows after the other
 * children) has no link. With a link, the planner would move the source
 * block to the position of the view block, also if the text did not change.
 */
export function linkBlocks(
  source: readonly FlatBlock[],
  view: readonly FlatBlock[],
): (number | undefined)[] {
  const links: (number | undefined)[] = new Array(view.length);
  for (const { gap, anchor } of gaps(
    anchorsOf(source, view, linkKey),
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
 * Returns the key that aligns two blocks of the same format (in
 * {@link alignBlocks}). The key of a text block is its text, and the key of a
 * table is its text, with a different prefix. The key of another block is
 * all its fields, for example the URL of an image. Blocks with equal keys
 * are the same block.
 */
export function alignmentKey(block: LensBlock): string {
  if (Array.isArray(block.content)) {
    return `text:${blockToText(block)}`;
  }
  if (isTableContent(block.content)) {
    return `table:${blockToText(block)}`;
  }
  return `block:${blockKey(block)}`;
}

/**
 * Returns the key that links a document block to its view block (in
 * {@link linkBlocks}). The format can lose fields of a block (for example the
 * width of an image). Thus, a block without content links by its type only.
 */
export function linkKey(block: LensBlock): string {
  return block.content === undefined
    ? `type:${block.type}`
    : alignmentKey(block);
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

function anchorsOf(
  a: readonly FlatBlock[],
  b: readonly FlatBlock[],
  keyOf: (block: LensBlock) => string,
) {
  return myersMatch(
    a.map((flat) => keyOf(flat.block)),
    b.map((flat) => keyOf(flat.block)),
    (x, y) => x === y,
  );
}

/** The blocks between two matched pairs: `a[aStart, aEnd)` and `b[bStart, bEnd)`. */
type Gap = { aStart: number; aEnd: number; bStart: number; bEnd: number };

/**
 * Returns the gaps before, between and after the pairs, in the two lists.
 * `anchor` is the pair after the gap, or `undefined` for the last gap.
 */
function gaps(
  pairs: readonly MatchedPair[],
  aEnd: number,
  bEnd: number,
): { gap: Gap; anchor: MatchedPair | undefined }[] {
  const result: { gap: Gap; anchor: MatchedPair | undefined }[] = [];
  let aStart = 0;
  let bStart = 0;
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
 * Returns the pairs of blocks that prefer each other, if the overlap is at
 * least {@link MIN_SHARE} of the shorter text:
 *
 * - A block of `a` (the view) prefers the block of `b` with the largest
 *   overlap. Thus, a split block stays the part with most of its text.
 * - A block of `b` (the text) prefers the block of `a` that it covers best:
 *   the largest part of the text of that block. Thus, two joined blocks stay
 *   the first block, because the joined text covers the two blocks fully.
 *
 * On a tie, the earlier block wins. The overlaps come from one diff, thus the
 * pairs do not cross.
 */
function mutualBestPairs({
  overlaps,
  sizesA,
  sizesB,
}: ReturnType<typeof gapTexts>): MatchedPair[] {
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
    if (ofA === undefined || ofA.size < overlap.size) {
      bestOfA.set(overlap.aIndex, overlap);
    }
    const ofB = bestOfB.get(overlap.bIndex);
    if (ofB === undefined || coverage(ofB) < coverage(overlap)) {
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
