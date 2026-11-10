// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";

import { myersMatch } from "../util/sequence/myers.js";
import { type Diff3Handlers, diff3 } from "./diff3.js";

/** All strings over the alphabet with a length from 0 to `maxLength`. */
function allStrings(alphabet: string, maxLength: number): string[] {
  const result = [""];
  let level = [""];
  for (let length = 1; length <= maxLength; length++) {
    level = level.flatMap((text) =>
      Array.from(alphabet, (char) => text + char),
    );
    result.push(...level);
  }
  return result;
}

type Unit = { char: string };
type Origin = { side: "base" | "ours" | "theirs"; index: number };

/**
 * Merges three strings character by character. The origin of each unit (its
 * side and index) is in a map, not in the unit: `diff3` compares units with
 * `deepEqual` to find the same change on the two sides.
 */
function merge(
  base: string,
  ours: string,
  theirs: string,
  options: Partial<Diff3Handlers<Unit>> = {},
) {
  const origins = new Map<Unit, Origin>();
  const unitsOf = (text: string, side: Origin["side"]) =>
    Array.from(text, (char, index) => {
      const unit = { char };
      origins.set(unit, { side, index });
      return unit;
    });
  const o = unitsOf(base, "base");
  const a = unitsOf(ours, "ours");
  const b = unitsOf(theirs, "theirs");
  const equals = (x: Unit, y: Unit) => x.char === y.char;
  let conflicts = 0;
  const units = diff3(
    o,
    a,
    b,
    myersMatch(o, a, equals),
    myersMatch(o, b, equals),
    {
      stable: ({ theirs }) => theirs,
      ours: (run) => run,
      conflict: () => conflicts++,
      ...options,
    },
  );
  return {
    text: units.map((unit) => unit.char).join(""),
    origins: units.map((unit) => origins.get(unit)!),
    conflicts,
  };
}

const STRINGS = allStrings("ab", 3);
const OPTIONS: Partial<Diff3Handlers<Unit>>[] = [
  {},
  { conflictWinner: "theirs" },
  { keepBothInserts: "ours-first" },
  { keepBothInserts: "theirs-first", conflictWinner: "theirs" },
  { keepTheirs: () => true },
];

describe("diff3: laws on all strings of length 0 to 3 over {a, b}", () => {
  it("gives theirs if ours did not change, without a conflict", () => {
    for (const options of OPTIONS) {
      for (const base of STRINGS) {
        for (const theirs of STRINGS) {
          const result = merge(base, base, theirs, options);
          expect({ base, theirs, text: result.text }).toEqual({
            base,
            theirs,
            text: theirs,
          });
          expect(result.conflicts).toBe(0);
        }
      }
    }
  });

  it("gives ours if theirs did not change, without a conflict", () => {
    for (const options of OPTIONS) {
      for (const base of STRINGS) {
        for (const ours of STRINGS) {
          const result = merge(base, ours, base, options);
          expect({ base, ours, text: result.text }).toEqual({
            base,
            ours,
            text: ours,
          });
          expect(result.conflicts).toBe(0);
        }
      }
    }
  });

  it("gives the change one time if the two sides made the same change, without a conflict", () => {
    for (const options of OPTIONS) {
      for (const base of STRINGS) {
        for (const changed of STRINGS) {
          const result = merge(base, changed, changed, options);
          expect({ base, changed, text: result.text }).toEqual({
            base,
            changed,
            text: changed,
          });
          expect(result.conflicts).toBe(0);
        }
      }
    }
  });

  it("gives only units of ours and of theirs, each one time, in the order of its side", () => {
    for (const options of OPTIONS) {
      for (const base of STRINGS) {
        for (const ours of STRINGS) {
          for (const theirs of STRINGS) {
            const { origins } = merge(base, ours, theirs, options);
            // Each index of a side is in the result at most one time, and
            // the indexes of a side increase.
            const valid = (["ours", "theirs"] as const).every((side) => {
              const indexes = origins
                .filter((origin) => origin.side === side)
                .map((origin) => origin.index);
              return indexes.every(
                (index, i) => i === 0 || index > indexes[i - 1],
              );
            });
            if (!valid || origins.some((origin) => origin.side === "base")) {
              expect({ base, ours, theirs, options, origins }).toBeUndefined();
            }
          }
        }
      }
    }
  });
});

describe("diff3: edge cases", () => {
  it("gives an empty result for three empty sequences", () => {
    expect(merge("", "", "").text).toBe("");
  });

  it("keeps two inserts into an empty base", () => {
    expect(merge("", "x", "y").text).toBe("x");
    expect(merge("", "x", "y").conflicts).toBe(1);
    expect(merge("", "x", "y", { keepBothInserts: "ours-first" }).text).toBe(
      "xy",
    );
    expect(merge("", "x", "y", { keepBothInserts: "theirs-first" }).text).toBe(
      "yx",
    );
    expect(merge("", "x", "y", { conflictWinner: "theirs" }).text).toBe("y");
  });

  it("removes a unit that both sides removed", () => {
    expect(merge("abc", "ac", "ac")).toMatchObject({
      text: "ac",
      conflicts: 0,
    });
  });

  it("gives a conflict if the two sides removed different parts of one run", () => {
    // Ours removes "b", theirs removes "ab": one unstable run between "c"
    // and the start, changed in two ways. As in the diff3 of GNU, this is a
    // conflict, not the union of the two removals ("c").
    expect(merge("abc", "ac", "c")).toMatchObject({ text: "ac", conflicts: 1 });
    expect(merge("abc", "ac", "c", { conflictWinner: "theirs" })).toMatchObject(
      { text: "c", conflicts: 1 },
    );
  });

  it("gives a conflict for a removal on one side and a change on the other side", () => {
    const result = merge("abc", "ac", "aXc", { conflictWinner: "theirs" });
    expect(result).toMatchObject({ text: "aXc", conflicts: 1 });
    expect(merge("abc", "ac", "aXc")).toMatchObject({
      text: "ac",
      conflicts: 1,
    });
  });

  it("does not give a conflict for two inserts at the same position with keepBothInserts", () => {
    expect(
      merge("ab", "aXb", "aYb", { keepBothInserts: "ours-first" }),
    ).toMatchObject({
      text: "aXYb",
      conflicts: 0,
    });
  });

  it("gives two inserts at the same position a conflict if a base unit is also changed there", () => {
    // keepBothInserts is only for runs without base units.
    expect(
      merge("abc", "aXc", "aYc", { keepBothInserts: "ours-first" }),
    ).toMatchObject({ text: "aXc", conflicts: 1 });
  });
});
