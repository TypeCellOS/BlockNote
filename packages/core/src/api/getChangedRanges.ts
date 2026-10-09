import {
  getChangedRanges as getChangedRangesQuadratic,
  type ChangedRange,
} from "@tiptap/core";
import type { Step, StepMap, Transform } from "prosemirror-transform";

/**
 * Tiptap's `getChangedRanges` (https://github.com/ueberdosis/tiptap/blob/main/packages/core/src/helpers/getChangedRanges.ts),
 * with the same result but without its quadratic cost on transforms with many
 * steps. Tiptap maps each changed range through every later step and back
 * through every step, and compares every range with every other range. A
 * version diff of a few thousand blocks has ~10,000 steps, which took seconds.
 *
 * Here, mapping skips runs of steps that provably leave the position
 * unchanged or only shift it (see {@link StepMapIndex}), and the simplify pass
 * only compares ranges that can contain each other. For steps in document
 * order, both are close to linear.
 *
 * See also `getChangedRangeWithAttrs` (one range covering all changes, including
 * attribute-only steps, which this function skips like Tiptap's).
 *
 * Consider deprecating this function: a list of ranges is costly to compute
 * exactly, which is what makes this code complex. Its remaining callers
 * (UniqueID, autolink) might work from one range or from input events, but
 * what that changes in each of them needs a careful look first.
 */
export function getChangedRanges(transform: Transform): ChangedRange[] {
  const { mapping, steps } = transform;
  const maps = mapping.maps;
  // A mirrored mapping (from rebasing steps) recovers positions across step
  // pairs, which the skips below don't model.
  for (let i = 0; i < maps.length; i++) {
    if (mapping.getMirror(i) !== undefined) {
      return getChangedRangesQuadratic(transform);
    }
  }

  const index = new StepMapIndex(maps);
  const changes: ChangedRange[] = [];
  maps.forEach((stepMap, i) => {
    const ranges: { from: number; to: number }[] = [];
    stepMap.forEach((from, to) => ranges.push({ from, to }));
    // Steps that change no positions (e.g. marks) still change their range.
    if (!ranges.length) {
      const { from, to } = steps[i] as Step & { from?: number; to?: number };
      if (from === undefined || to === undefined) {
        return;
      }
      ranges.push({ from, to });
    }

    for (const { from, to } of ranges) {
      const newStart = index.mapForward(from, -1, i);
      const newEnd = index.mapForward(to, 1, i);
      changes.push({
        oldRange: {
          from: index.mapBackward(newStart, -1),
          to: index.mapBackward(newEnd, 1),
        },
        newRange: { from: newStart, to: newEnd },
      });
    }
  });

  return simplifyChangedRanges(changes);
}

/**
 * Removes duplicated ranges and ranges that other ranges fully contain, like
 * Tiptap's `simplifyChangedRanges`.
 */
function simplifyChangedRanges(changes: ChangedRange[]): ChangedRange[] {
  const seen = new Set<string>();
  const unique = changes.filter(({ oldRange, newRange }) => {
    const key = `${oldRange.from},${oldRange.to},${newRange.from},${newRange.to}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
  if (unique.length === 1) {
    return unique;
  }

  // Each old range is its new range mapped back with the same mapping, which
  // keeps order. So when a new range contains another, its old range does
  // too, and comparing the new ranges is enough.
  const byNewFrom = unique
    .map((_, i) => i)
    .sort((a, b) => unique[a].newRange.from - unique[b].newRange.from);
  const newTo = new SegmentTree(
    byNewFrom.map((i) => unique[i].newRange.to),
    "max",
  );

  return unique.filter((change, i) => {
    // The last candidate whose new range starts at or before this one.
    let lo = 0;
    let hi = byNewFrom.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (unique[byNewFrom[mid]].newRange.from <= change.newRange.from) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }
    const contained = newTo.someBefore(
      lo,
      (to) => to >= change.newRange.to,
      (k) => byNewFrom[k] !== i,
    );
    return !contained;
  });
}

/**
 * Maps positions through a list of step maps like `Mapping#map`, but skips
 * runs of maps that can't affect the position. For a step map, a position
 * before its first range stays unchanged, and a position after all its
 * ranges only shifts by the map's size change. Only positions inside its
 * ranges need the map itself.
 *
 * Each map is checked directly. Only a long run of such maps is skipped with
 * a segment tree, so transforms with few steps don't pay for the trees.
 */
class StepMapIndex {
  private readonly inverted: (StepMap | undefined)[];
  /** Per map: the lowest start of its ranges, before or after the map. */
  private readonly firstStarts: number[] = [];
  /** Per map: its last range end in the old doc. */
  private readonly oldEnds: number[] = [];
  /** Per map: its last range end in the new doc. */
  private readonly newEnds: number[] = [];
  /** Sum of the size changes of the maps before each index. */
  private readonly shift: number[] = [0];
  private trees:
    | {
        firstStart: SegmentTree;
        /** `oldEnds` minus `shift` at each map. */
        forwardShiftFrom: SegmentTree;
        /** `newEnds` minus `shift` after each map. */
        backwardShiftFrom: SegmentTree;
      }
    | undefined;

  constructor(private readonly maps: readonly StepMap[]) {
    this.inverted = new Array(maps.length);
    for (const map of maps) {
      let first = Infinity;
      let oldEnd = -Infinity;
      let newEnd = -Infinity;
      let sizeChange = 0;
      map.forEach((oldStart, oldStop, newStart, newStop) => {
        first = Math.min(first, oldStart, newStart);
        oldEnd = Math.max(oldEnd, oldStop);
        newEnd = Math.max(newEnd, newStop);
        sizeChange += newStop - newStart - (oldStop - oldStart);
      });
      this.firstStarts.push(first);
      this.oldEnds.push(oldEnd);
      this.newEnds.push(newEnd);
      this.shift.push(this.shift[this.shift.length - 1] + sizeChange);
    }
  }

  /** Like `mapping.slice(from).map(pos, assoc)`. */
  mapForward(pos: number, assoc: number, from: number): number {
    // How many maps in a row `pos` lay before (> 0) or after (< 0).
    let skipped = 0;
    let i = from;
    while (i < this.maps.length) {
      if (pos < this.firstStarts[i]) {
        // `pos` lies before this map.
        skipped = Math.max(skipped, 0) + 1;
        if (skipped > LONG_RUN) {
          i = this.getTrees().firstStart.firstFrom(i, (s) => s <= pos);
          skipped = 0;
        } else {
          i++;
        }
      } else if (pos > this.oldEnds[i]) {
        // `pos` lies after this map, which only shifts it.
        skipped = Math.min(skipped, 0) - 1;
        if (skipped < -LONG_RUN) {
          const base = pos - this.shift[i];
          const next = this.getTrees().forwardShiftFrom.firstFrom(
            i,
            (end) => end >= base,
          );
          pos += this.shift[next] - this.shift[i];
          i = next;
          skipped = 0;
        } else {
          pos += this.shift[i + 1] - this.shift[i];
          i++;
        }
      } else {
        pos = this.maps[i].map(pos, assoc);
        skipped = 0;
        i++;
      }
    }
    return pos;
  }

  /** Like `mapping.invert().map(pos, assoc)`. */
  mapBackward(pos: number, assoc: number): number {
    let skipped = 0;
    let i = this.maps.length - 1;
    while (i >= 0) {
      if (pos < this.firstStarts[i]) {
        skipped = Math.max(skipped, 0) + 1;
        if (skipped > LONG_RUN) {
          i = this.getTrees().firstStart.lastFrom(i, (s) => s <= pos);
          skipped = 0;
        } else {
          i--;
        }
      } else if (pos > this.newEnds[i]) {
        skipped = Math.min(skipped, 0) - 1;
        if (skipped < -LONG_RUN) {
          const base = pos - this.shift[i + 1];
          const next = this.getTrees().backwardShiftFrom.lastFrom(
            i,
            (end) => end >= base,
          );
          pos -= this.shift[i + 1] - this.shift[next + 1];
          i = next;
          skipped = 0;
        } else {
          pos -= this.shift[i + 1] - this.shift[i];
          i--;
        }
      } else {
        this.inverted[i] ??= this.maps[i].invert();
        pos = this.inverted[i]!.map(pos, assoc);
        skipped = 0;
        i--;
      }
    }
    return pos;
  }

  private getTrees() {
    this.trees ??= {
      firstStart: new SegmentTree(this.firstStarts, "min"),
      forwardShiftFrom: new SegmentTree(
        this.oldEnds.map((end, i) => end - this.shift[i]),
        "max",
      ),
      backwardShiftFrom: new SegmentTree(
        this.newEnds.map((end, i) => end - this.shift[i + 1]),
        "max",
      ),
    };
    return this.trees;
  }
}

/** Above this many maps in a row that can be skipped, a tree skips the rest. */
const LONG_RUN = 8;

/** Finds the nearest value that matches a monotone min/max condition. */
class SegmentTree {
  private readonly size: number;
  private readonly tree: number[];

  constructor(
    private readonly values: number[],
    private readonly kind: "min" | "max",
  ) {
    this.size = values.length;
    this.tree = new Array(4 * Math.max(1, values.length));
    if (values.length) {
      this.build(1, 0, values.length - 1);
    }
  }

  /**
   * The first index at or after `from` whose value matches, or `size`.
   * `matches` must hold for a subtree's min (or max) whenever it holds for
   * any value in it.
   */
  firstFrom(from: number, matches: (value: number) => boolean): number {
    const found = this.first(1, 0, this.size - 1, from, matches);
    return found === -1 ? this.size : found;
  }

  /** The last index at or before `to` whose value matches, or -1. */
  lastFrom(to: number, matches: (value: number) => boolean): number {
    return this.last(1, 0, this.size - 1, to, matches);
  }

  /**
   * Whether `found` holds for an index at or before `to` whose value
   * matches, checking those indexes from the last one down.
   */
  someBefore(
    to: number,
    matches: (value: number) => boolean,
    found: (index: number) => boolean,
  ): boolean {
    for (let i = this.lastFrom(to, matches); i !== -1;) {
      if (found(i)) {
        return true;
      }
      i = i === 0 ? -1 : this.lastFrom(i - 1, matches);
    }
    return false;
  }

  private build(node: number, lo: number, hi: number) {
    if (lo === hi) {
      this.tree[node] = this.values[lo];
      return;
    }
    const mid = (lo + hi) >> 1;
    this.build(2 * node, lo, mid);
    this.build(2 * node + 1, mid + 1, hi);
    this.tree[node] =
      this.kind === "min"
        ? Math.min(this.tree[2 * node], this.tree[2 * node + 1])
        : Math.max(this.tree[2 * node], this.tree[2 * node + 1]);
  }

  private first(
    node: number,
    lo: number,
    hi: number,
    from: number,
    matches: (value: number) => boolean,
  ): number {
    if (hi < from || !matches(this.tree[node])) {
      return -1;
    }
    if (lo === hi) {
      return lo;
    }
    const mid = (lo + hi) >> 1;
    const left = this.first(2 * node, lo, mid, from, matches);
    return left !== -1
      ? left
      : this.first(2 * node + 1, mid + 1, hi, from, matches);
  }

  private last(
    node: number,
    lo: number,
    hi: number,
    to: number,
    matches: (value: number) => boolean,
  ): number {
    if (lo > to || !matches(this.tree[node])) {
      return -1;
    }
    if (lo === hi) {
      return lo;
    }
    const mid = (lo + hi) >> 1;
    const right = this.last(2 * node + 1, mid + 1, hi, to, matches);
    return right !== -1 ? right : this.last(2 * node, lo, mid, to, matches);
  }
}
