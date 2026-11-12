import type { LensInlineContent } from "../model.js";
import { deepEqual } from "../util/blocks/index.js";

/**
 * The two kinds of merge in this folder. In the target stage, `theirs` is
 * the source document, and `base` and `ours` come from the format (the view
 * and the text). In the document merge, `theirs` is a later version with the
 * changes of other writers. The kind changes two rules:
 *
 * - A conflict: in the target stage, `ours` (the text) wins, because `theirs` has
 *   only data that the format does not show. In the document merge, `theirs`
 *   (the current document) wins, because the client gets the warning: thus, the
 *   client loses the conflicting part, and it can read the document again.
 *   A write from an older version then never reverts a change that it did
 *   not see.
 * - Two inserts at the same position: in the document merge, both stay. In the
 *   target stage, an insert of `theirs` at the position of an insert of `ours` is
 *   a difference that the format makes (for example whitespace). Thus, it
 *   does not stay.
 *
 * @internal
 */
export type MergeOptions =
  | {
      kind: "target";
      /**
       * The text that the format shows for an inline item that its parse
       * does not give back (for example "@Bob" for a mention in markdown),
       * or `undefined`. `base` and `ours` come from the format, thus they
       * have that text where `theirs` has the item.
       */
      shadowOf: (item: LensInlineContent) => string | undefined;
    }
  | {
      kind: "document";
      /**
       * Called when `ours` and `theirs` changed the same value (or the same
       * part of a text) in different ways (a conflict), for a warning.
       */
      onConflict: () => void;
    };

/**
 * The merge options of the target stage without shadows: the default of the
 * merge functions. Only their unit tests use the default.
 *
 * @internal
 */
export const TARGET_WITHOUT_SHADOWS: MergeOptions = {
  kind: "target",
  shadowOf: () => undefined,
};

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
 * The conflict rule of a kind of merge: `ours` (the text) wins in the target
 * stage, and `theirs` wins in the document merge (see `MergeOptions`).
 *
 * @internal
 */
export function conflictRuleOf(options: MergeOptions): ConflictRule {
  return options.kind === "target"
    ? OURS_WINS
    : { winner: "theirs", onConflict: options.onConflict };
}

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
