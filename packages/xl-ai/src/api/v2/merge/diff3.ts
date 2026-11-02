import type { MatchedPair } from "../diff/types.js";

/** Matched units of base, ours and theirs: a stable point of the merge. */
export type StableTriple<T> = { base: T; ours: T; theirs: T };

/**
 * The nearest stable triples before and after a run, that `isContext`
 * accepts. A side is `undefined` if there is no such triple on that side.
 */
export type RunContext<T> = {
  before: StableTriple<T> | undefined;
  after: StableTriple<T> | undefined;
};

export type Diff3Handlers<T> = {
  /** Merges a unit that is in the three sequences. */
  stable: (triple: StableTriple<T>) => T;
  /** Changes a run of units that ours added or changed. */
  ours: (units: T[], context: RunContext<T>) => T[];
  /** Returns true if a stable triple can be a context. By default, all can. */
  isContext?: (triple: StableTriple<T>) => boolean;
  /**
   * If true, two inserts at the same position (without base units between
   * the stable units) both stay: first the inserts of theirs, then the
   * inserts of ours. If not, ours wins, as in a conflict.
   */
  keepBothInserts?: boolean;
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
 *   different from the base, theirs wins. If not, ours wins. Thus, ours also
 *   wins a conflict, where the two sides changed.
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

  const isContext = handlers.isContext ?? (() => true);
  // The context triple at each base index, or `undefined`.
  const contexts = base.map((unit, i) => {
    if (toA[i] === -1 || toB[i] === -1) {
      return undefined;
    }
    const triple = { base: unit, ours: ours[toA[i]], theirs: theirs[toB[i]] };
    return isContext(triple) ? triple : undefined;
  });
  function contextFrom(from: number) {
    return contexts.slice(from).find((triple) => triple !== undefined);
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

    if (isUnchanged(toA, i, i2, ja, ja2, base, ours, handlers.same)) {
      merged.push(...theirs.slice(jb, jb2));
    } else {
      if (i === i2 && handlers.keepBothInserts) {
        merged.push(...theirs.slice(jb, jb2));
      }
      merged.push(
        ...handlers.ours(ours.slice(ja, ja2), {
          before,
          after: contextFrom(i2),
        }),
      );
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
