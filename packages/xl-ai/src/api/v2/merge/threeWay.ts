import { deepEqual } from "../blocks/json.js";
import type { LensInlineContent } from "../blocks/types.js";

/**
 * The options of the merges in this folder. `concurrent` is true if `theirs`
 * is a later version with the changes of other writers (the tree merge), not the
 * document of a view (the target stage). This changes two rules:
 *
 * - A conflict: in the target stage, `ours` (the text) wins, because `theirs` has
 *   only data that the format does not show. In the tree merge, `theirs` (the
 *   current document) wins, because the client gets the warning: thus, the
 *   client loses the conflicting part, and it can read the document again.
 *   A write from an older version then never reverts a change that it did
 *   not see.
 * - Two inserts at the same position: in the tree merge, both stay. In the
 *   target stage, an insert of `theirs` at the position of an insert of `ours` is
 *   a difference that the format makes (for example whitespace). Thus, it
 *   does not stay.
 */
export type MergeOptions = {
  concurrent?: boolean;
  /**
   * Called when `ours` and `theirs` changed the same value (or the same part
   * of a text) in different ways (a conflict). The tree merge uses this for a
   * warning.
   */
  onConflict?: () => void;
  /**
   * The text that the format shows for an inline item that its parse does
   * not give back (for example "@Bob" for a mention in markdown), or
   * `undefined`. Only the target stage sets this: there, `base` and `ours` come
   * from the format, thus they have that text where `theirs` has the item.
   */
  shadowOf?: (item: LensInlineContent) => string | undefined;
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
 * sides changed the value in different ways (a conflict), `ours` wins, and
 * in the tree merge `theirs` wins (see `MergeOptions`).
 */
export function mergeValue<T>(
  base: T,
  ours: T,
  theirs: T,
  options: MergeOptions = {},
): T {
  if (deepEqual(base, ours)) {
    return theirs;
  }
  if (deepEqual(base, theirs) || deepEqual(ours, theirs)) {
    return ours;
  }
  options.onConflict?.();
  return options.concurrent ? theirs : ours;
}

/**
 * Applies {@link mergeValue} to each key of the three objects. The result
 * does not contain keys with the value `undefined`.
 */
export function mergeRecords<R extends object>(
  base: R,
  ours: R,
  theirs: R,
  options: MergeOptions = {},
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
      options,
    );
    if (value !== undefined) {
      result[key] = value;
    }
  }
  // Each key comes from one of the three records, with the value type of that record.
  return result as R;
}
