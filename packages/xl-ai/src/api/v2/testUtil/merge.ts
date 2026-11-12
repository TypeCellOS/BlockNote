import type { MergeRules } from "../merge/threeWay.js";

/**
 * Each combination of the merge rules (8), with a name. The type of the
 * rules allows each combination, thus each must give a valid result: the
 * property tests of the merges examine their laws for each one. `rules`
 * takes the report of a conflict (for the rules in which theirs wins).
 */
export function allMergeRules(): {
  name: string;
  rules: (onConflict?: () => void) => MergeRules;
}[] {
  const result: {
    name: string;
    rules: (onConflict?: () => void) => MergeRules;
  }[] = [];
  for (const winner of ["ours", "theirs"] as const) {
    for (const inserts of ["conflict", "both-theirs-first"] as const) {
      for (const hidden of [false, true]) {
        result.push({
          name: `${winner} wins, inserts: ${inserts}${hidden ? ", hidden items" : ""}`,
          rules: (onConflict = () => {}) => ({
            conflict: winner === "ours" ? { winner } : { winner, onConflict },
            insertsAtOnePosition: inserts,
            ...(hidden ? { hiddenItems: { shadowOf: () => undefined } } : {}),
          }),
        });
      }
    }
  }
  return result;
}

/** The rules in which `theirs` wins a conflict, and both inserts at one position stay. */
export function theirsWinsRules(onConflict: () => void = () => {}): MergeRules {
  return {
    conflict: { winner: "theirs", onConflict },
    insertsAtOnePosition: "both-theirs-first",
  };
}
