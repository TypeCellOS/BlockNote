import { describe, expect, it } from "vite-plus/test";

import { myersMatch } from "../diff/myers.js";
import { diff3, type RunContext } from "./diff3.js";

/** Merges three strings character by character, with the default handlers. */
function merge(base: string, ours: string, theirs: string) {
  const o = Array.from(base);
  const a = Array.from(ours);
  const b = Array.from(theirs);
  const equals = (x: string, y: string) => x === y;
  return diff3(o, a, b, myersMatch(o, a, equals), myersMatch(o, b, equals), {
    stable: ({ theirs }) => theirs,
    ours: (units) => units,
  }).join("");
}

describe("diff3", () => {
  it("gives theirs if only theirs changed", () => {
    expect(merge("abc", "abc", "aXc")).toBe("aXc");
  });

  it("gives ours if only ours changed", () => {
    expect(merge("abc", "aYc", "abc")).toBe("aYc");
  });

  it("keeps changes of the two sides at different positions", () => {
    expect(merge("abcde", "aYcde", "abcXe")).toBe("aYcXe");
  });

  it("gives the change of ours for a conflict", () => {
    expect(merge("abc", "aYc", "aXc")).toBe("aYc");
  });

  it("keeps additions at the end of the two sides", () => {
    expect(merge("ab", "abY", "ab")).toBe("abY");
    expect(merge("ab", "ab", "abX")).toBe("abX");
  });

  it("gives the ours handler the stable triples around the run as context", () => {
    const contexts: RunContext<string>[] = [];
    const o = Array.from("ab");
    const a = Array.from("aYbZ");
    const equals = (x: string, y: string) => x === y;
    diff3(o, a, o, myersMatch(o, a, equals), myersMatch(o, o, equals), {
      stable: ({ theirs }) => theirs,
      ours: (units, context) => {
        contexts.push(context);
        return units;
      },
    });
    expect(contexts).toEqual([
      {
        before: { base: "a", ours: "a", theirs: "a" },
        after: { base: "b", ours: "b", theirs: "b" },
      },
      { before: { base: "b", ours: "b", theirs: "b" }, after: undefined },
    ]);
  });
});
