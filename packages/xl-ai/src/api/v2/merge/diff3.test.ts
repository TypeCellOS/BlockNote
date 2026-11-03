import { describe, expect, it } from "vite-plus/test";

import { myersMatch } from "../diff/myers.js";
import { diff3, type RunContext } from "./diff3.js";

/** Merges three strings character by character, with the default handlers. */
function merge(
  base: string,
  ours: string,
  theirs: string,
  keepBothInserts?: "theirs-first" | "ours-first",
) {
  const o = Array.from(base);
  const a = Array.from(ours);
  const b = Array.from(theirs);
  const equals = (x: string, y: string) => x === y;
  return diff3(o, a, b, myersMatch(o, a, equals), myersMatch(o, b, equals), {
    stable: ({ theirs }) => theirs,
    ours: (units) => units,
    keepBothInserts,
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

  it("keeps two inserts at the same position if the handlers say so, in the given order", () => {
    expect(merge("ab", "aXb", "aYb")).toBe("aXb");
    expect(merge("ab", "aXb", "aYb", "theirs-first")).toBe("aYXb");
    expect(merge("ab", "aXb", "aYb", "ours-first")).toBe("aXYb");
  });

  it("applies a change that the two sides made one time", () => {
    expect(merge("helo", "hello", "hello")).toBe("hello");
    expect(merge("ab", "aXb", "aXb", "theirs-first")).toBe("aXb");
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
        replaced: { base: [], theirs: [] },
      },
      {
        before: { base: "b", ours: "b", theirs: "b" },
        after: undefined,
        replaced: { base: [], theirs: [] },
      },
    ]);
  });

  it("gives the ours handler the units of base and theirs that the run replaces", () => {
    const contexts: RunContext<string>[] = [];
    const o = Array.from("aXb");
    const a = Array.from("aYb");
    const b = Array.from("aZb");
    const equals = (x: string, y: string) => x === y;
    diff3(o, a, b, myersMatch(o, a, equals), myersMatch(o, b, equals), {
      stable: ({ theirs }) => theirs,
      ours: (units, context) => {
        contexts.push(context);
        return units;
      },
    });
    expect(contexts.map((context) => context.replaced)).toEqual([
      { base: ["X"], theirs: ["Z"] },
    ]);
  });
});
