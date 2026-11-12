import type { MergeOptions } from "../merge/threeWay.js";

/**
 * The merge options of the document merge (`concurrent`), or else of the
 * target stage without shadows. The property tests of the merges examine
 * both kinds with one loop.
 */
export function mergeOptions(
  concurrent: boolean,
  onConflict: () => void = () => {},
): MergeOptions {
  return concurrent
    ? { kind: "document", onConflict }
    : { kind: "target", shadowOf: () => undefined };
}
