import type { LensInlineContent } from "../model.js";
import { deepEqual } from "../util/blocks/index.js";
import type { ChangeUnit } from "../util/sequence/index.js";

/**
 * Which side wins a conflict: the two sides changed a value in different
 * ways. `ours` wins without a report, or `theirs` wins, and `onConflict`
 * reports it (for a warning).
 *
 * @internal
 */
export type ConflictRule =
  | { winner: "ours" }
  | { winner: "theirs"; onConflict: () => void };

/**
 * The conflict rule in which `ours` wins: the default of {@link mergeValue}.
 *
 * @internal
 */
export const OURS_WINS: ConflictRule = { winner: "ours" };

/**
 * The rules of a merge of content (a block, inline content or a table).
 * Each combination of the rules is valid.
 *
 * @internal
 */
export type MergeRules = {
  /** Which side wins a conflict, and its report. */
  conflict: ConflictRule;
  /**
   * Two inserts at one position: both stay, the insert of `theirs` first; or
   * they are a conflict (see `conflict`).
   */
  insertsAtOnePosition: "both-theirs-first" | "conflict";
  /**
   * The unit of a change in text. With `character`, the two sides can
   * change different characters of one word, and both changes apply. With
   * `word`, a word that the two sides changed is a conflict.
   */
  changeUnit: ChangeUnit;
  /**
   * If set, `base` and `ours` show `theirs` without some of its inline items
   * (for example a format that does not show mentions). An inline item of
   * `theirs` that they do not have stays, and `shadowOf` gives the text that
   * they show for an item, or `undefined`.
   */
  hiddenItems?: {
    shadowOf: (item: LensInlineContent) => string | undefined;
  };
};

/**
 * The default rules of the merge functions, for their unit tests: `ours`
 * wins a conflict, two inserts at one position are a conflict, a change can
 * be a part of a word, and `base` and `ours` can lack inline items of
 * `theirs` (without shadows).
 *
 * @internal
 */
export const DEFAULT_RULES: MergeRules = {
  conflict: OURS_WINS,
  insertsAtOnePosition: "conflict",
  changeUnit: "character",
  hiddenItems: { shadowOf: () => undefined },
};

/**
 * The three-way rule for all merges in this folder, with one vocabulary:
 *
 * - `base`: the common start of the two sides.
 * - `ours`: the side that makes the change. Its difference from `base` is the
 *   change to apply.
 * - `theirs`: the side that gets the change. It can have data that `base`
 *   does not show, and changes of other writers.
 *
 * If `ours` is different from `base`, the result is `ours`. If not, the
 * result is `theirs`. Thus, data that `base` does not show stays. If the two
 * sides changed the value in different ways (a conflict), `conflict` tells
 * which side wins.
 *
 * Method: the standard three-way rule for one value, as diff3 uses it for one
 * item.
 *
 * @internal
 */
export function mergeValue<T>(
  base: T,
  ours: T,
  theirs: T,
  conflict: ConflictRule = OURS_WINS,
): T {
  if (deepEqual(base, ours)) {
    return theirs;
  }
  if (deepEqual(base, theirs) || deepEqual(ours, theirs)) {
    return ours;
  }
  if (conflict.winner === "ours") {
    return ours;
  }
  conflict.onConflict();
  return theirs;
}

/**
 * Applies {@link mergeValue} to each key of the three objects. The result
 * does not contain keys with the value `undefined`.
 *
 * @internal
 */
export function mergeRecords<R extends object>(
  base: R,
  ours: R,
  theirs: R,
  conflict: ConflictRule = OURS_WINS,
): R {
  function read(record: R, key: string) {
    return (record as Record<string, unknown>)[key];
  }
  const result: Record<string, unknown> = {};
  for (const key of new Set([
    ...Object.keys(base),
    ...Object.keys(ours),
    ...Object.keys(theirs),
  ])) {
    const value = mergeValue(
      read(base, key),
      read(ours, key),
      read(theirs, key),
      conflict,
    );
    if (value !== undefined) {
      result[key] = value;
    }
  }
  // Each key comes from one of the three records, with the value type of that record.
  return result as R;
}
