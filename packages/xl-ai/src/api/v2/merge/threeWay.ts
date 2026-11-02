import { deepEqual } from "../blocks/json.js";

/**
 * The options of the merges in this folder. `concurrent` is true if `theirs`
 * is a later version with the changes of other writers (the rebase), not the
 * document of a view (the planner). Then two inserts at the same position
 * both stay. In the planner, an insert of `theirs` at the position of an
 * insert of `ours` is a difference that the format makes (for example
 * whitespace). Thus, it does not stay.
 */
export type MergeOptions = { concurrent?: boolean };

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
 * result is `theirs`. Thus, data that `base` does not show stays, and `ours`
 * wins a conflict.
 */
export function mergeValue<T>(base: T, ours: T, theirs: T): T {
  return deepEqual(base, ours) ? theirs : ours;
}

/**
 * Applies {@link mergeValue} to each key of the three objects. The result
 * does not contain keys with the value `undefined`.
 */
export function mergeRecords<R extends object>(base: R, ours: R, theirs: R): R {
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
    );
    if (value !== undefined) {
      result[key] = value;
    }
  }
  // Each key comes from one of the three records, with the value type of that record.
  return result as R;
}
