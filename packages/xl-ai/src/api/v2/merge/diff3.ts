import { deepEqual } from "../blocks/json.js";
import type { MatchedPair } from "../diff/types.js";

/** Matched units of base, ours and theirs: a stable point of the merge. */
export type StableTriple<T> = { base: T; ours: T; theirs: T };

/**
 * The context of a run of ours: the nearest stable triples before and after
 * it, that `isContext` accepts (a side is `undefined` if there is no such
 * triple on that side), and the units of base and theirs that the run
 * replaces (empty for an insert).
 */
export type RunContext<T> = {
  before: StableTriple<T> | undefined;
  after: StableTriple<T> | undefined;
  replaced: { base: T[]; theirs: T[] };
};

export type Diff3Handlers<T> = {
  /** Merges a unit that is in the three sequences. */
  stable: (triple: StableTriple<T>) => T;
  /** Changes a run of units that ours added or changed. */
  ours: (units: T[], context: RunContext<T>) => T[];
  /** Called when the two sides changed a run in different ways (a conflict). */
  conflict?: () => void;
  /**
   * The side that wins a conflict. By default, ours. The rebase gives a
   * conflict to theirs, the current document (see `MergeOptions`).
   */
  conflictWinner?: "ours" | "theirs";
  /** Returns true if a stable triple can be a context. By default, all can. */
  isContext?: (triple: StableTriple<T>) => boolean;
  /**
   * If set, two inserts at the same position (without base units between
   * the stable units) both stay, in the given order. If not, they are a
   * conflict.
   */
  keepBothInserts?: "theirs-first" | "ours-first";
  /**
   * Returns true for a unit of theirs without a base unit that stays in a run
   * that ours wins: for example a mention that the format does not show (in
   * the planner), or a new block of another writer (in the tree merge). It
   * stays before the units of ours if it is before the units of theirs with
   * a base unit in the run, else after them.
   */
  keepTheirs?: (unit: T) => boolean;
  /**
   * Returns true if a matched unit of ours is the same as its base unit. By
   * default, a match is the same unit. Give this function if the matches can
   * pair changed units (for example rows with changed text at the same
   * position). Then a side with a changed unit is not unchanged.
   */
  same?: (base: T, other: T) => boolean;
};

/**
 * Three-way merge of sequences (diff3). The input contains the matches of the
 * base to ours and to theirs.
 *
 * - A base unit with a match on the two sides is stable. `handlers.stable`
 *   merges it.
 * - Between stable units, the side that changed wins. If only theirs is
 *   different from the base, theirs wins. If the two sides made the same
 *   change, it applies one time. If not (a conflict), the side of
 *   `handlers.conflictWinner` wins (by default, ours).
 * - Two inserts at the same position can both stay (see
 *   `handlers.keepBothInserts`).
 */
export function diff3<T>(
  base: readonly T[],
  ours: readonly T[],
  theirs: readonly T[],
  baseToOurs: readonly MatchedPair[],
  baseToTheirs: readonly MatchedPair[],
  handlers: Diff3Handlers<T>,
): T[] {
  const toA = indexMap(baseToOurs, base.length);
  const toB = indexMap(baseToTheirs, base.length);
  /** The units of theirs with a base unit. */
  const theirsMatched = new Uint8Array(theirs.length);
  for (const pair of baseToTheirs) {
    theirsMatched[pair.bIndex] = 1;
  }

  const isContext = handlers.isContext ?? (() => true);
  // The context triple at each base index, or `undefined`.
  const contexts = base.map((unit, i) => {
    if (toA[i] === -1 || toB[i] === -1) {
      return undefined;
    }
    const triple = { base: unit, ours: ours[toA[i]], theirs: theirs[toB[i]] };
    return isContext(triple) ? triple : undefined;
  });
  // The first context triple at each base index or after it, from the end.
  const contextsAfter = new Array<StableTriple<T> | undefined>(base.length + 1);
  for (let k = base.length - 1; k >= 0; k--) {
    contextsAfter[k] = contexts[k] ?? contextsAfter[k + 1];
  }
  let before: StableTriple<T> | undefined;

  const merged: T[] = [];
  let i = 0;
  let ja = 0;
  let jb = 0;
  while (i < base.length || ja < ours.length || jb < theirs.length) {
    if (i < base.length && toA[i] === ja && toB[i] === jb) {
      before = contexts[i] ?? before;
      merged.push(
        handlers.stable({ base: base[i], ours: ours[ja], theirs: theirs[jb] }),
      );
      i++;
      ja++;
      jb++;
      continue;
    }

    // An unstable chunk: all units up to the next base unit with a match on the two sides.
    let i2 = i;
    while (i2 < base.length && (toA[i2] === -1 || toB[i2] === -1)) {
      i2++;
    }
    const ja2 = i2 < base.length ? toA[i2] : ours.length;
    const jb2 = i2 < base.length ? toB[i2] : theirs.length;

    if (
      deepEqual(ours.slice(ja, ja2), theirs.slice(jb, jb2)) ||
      isUnchanged(toA, i, i2, ja, ja2, base, ours, handlers.same)
    ) {
      // The two sides made the same change, or ours made no change.
      for (let j = jb; j < jb2; j++) {
        merged.push(theirs[j]);
      }
    } else {
      const both = i === i2 ? handlers.keepBothInserts : undefined;
      const conflict =
        both === undefined &&
        !isUnchanged(toB, i, i2, jb, jb2, base, theirs, handlers.same);
      if (conflict) {
        handlers.conflict?.();
      }
      if (conflict && handlers.conflictWinner === "theirs") {
        for (let j = jb; j < jb2; j++) {
          merged.push(theirs[j]);
        }
        i = i2;
        ja = ja2;
        jb = jb2;
        continue;
      }
      const theirsUnits = both === undefined ? [] : theirs.slice(jb, jb2);
      const oursUnits = handlers.ours(ours.slice(ja, ja2), {
        before,
        after: contextsAfter[i2],
        replaced: { base: base.slice(i, i2), theirs: theirs.slice(jb, jb2) },
      });
      // The units of theirs that stay in a run that ours wins.
      const keptBefore: T[] = [];
      const keptAfter: T[] = [];
      if (both === undefined && handlers.keepTheirs !== undefined) {
        let afterMatch = false;
        for (let j = jb; j < jb2; j++) {
          if (theirsMatched[j] === 1) {
            afterMatch = true;
          } else if (handlers.keepTheirs(theirs[j])) {
            (afterMatch ? keptAfter : keptBefore).push(theirs[j]);
          }
        }
      }
      const run =
        both === "ours-first"
          ? [...oursUnits, ...theirsUnits]
          : [...theirsUnits, ...oursUnits];
      for (const unit of [...keptBefore, ...run, ...keptAfter]) {
        merged.push(unit);
      }
    }

    i = i2;
    ja = ja2;
    jb = jb2;
  }

  return merged;
}

/** Maps each index of the `a` side to the index of its match on the `b` side, or to -1. */
function indexMap(pairs: readonly MatchedPair[], length: number): Int32Array {
  const map = new Int32Array(length).fill(-1);
  for (const pair of pairs) {
    map[pair.aIndex] = pair.bIndex;
  }
  return map;
}

/**
 * Returns true if `base[from, to)` maps one to one to `[otherFrom, otherTo)`,
 * and (with `same`) each pair is the same. Then, that side made no change.
 */
function isUnchanged<T>(
  map: Int32Array,
  from: number,
  to: number,
  otherFrom: number,
  otherTo: number,
  base: readonly T[],
  other: readonly T[],
  same: ((base: T, other: T) => boolean) | undefined,
): boolean {
  if (to - from !== otherTo - otherFrom) {
    return false;
  }
  for (let k = 0; k < to - from; k++) {
    if (
      map[from + k] !== otherFrom + k ||
      (same !== undefined && !same(base[from + k], other[otherFrom + k]))
    ) {
      return false;
    }
  }
  return true;
}
