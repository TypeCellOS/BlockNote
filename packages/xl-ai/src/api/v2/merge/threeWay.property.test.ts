// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";

import { deepEqual } from "../util/blocks/json.js";
import { createRandom } from "../testUtil/random.js";
import { mergeRecords, mergeValue, OURS_WINS } from "./threeWay.js";

const VALUES: unknown[] = [
  undefined,
  null,
  0,
  1,
  "",
  "red",
  true,
  false,
  { level: 1 },
  { level: 1, extra: undefined },
  { level: 2 },
  [1, 2],
];

describe("mergeValue: laws on all triples of a set of values", () => {
  it("follows the three-way rule, and calls onConflict only for a real conflict that theirs wins", () => {
    for (const theirsWins of [false, true]) {
      for (const base of VALUES) {
        for (const ours of VALUES) {
          for (const theirs of VALUES) {
            let conflicts = 0;
            const result = mergeValue(
              base,
              ours,
              theirs,
              theirsWins
                ? { winner: "theirs", onConflict: () => conflicts++ }
                : OURS_WINS,
            );
            const oursChanged = !deepEqual(base, ours);
            const theirsChanged = !deepEqual(base, theirs);
            const conflict =
              oursChanged && theirsChanged && !deepEqual(ours, theirs);
            // Only the rule in which theirs wins reports a conflict.
            expect(conflicts).toBe(conflict && theirsWins ? 1 : 0);
            if (!oursChanged) {
              expect(result).toBe(theirs);
            } else if (!conflict) {
              expect(result).toBe(ours);
            } else {
              expect(result).toBe(theirsWins ? theirs : ours);
            }
          }
        }
      }
    }
  });

  it("is symmetric in ours and theirs, except for the winner of a conflict", () => {
    for (const base of VALUES) {
      for (const ours of VALUES) {
        for (const theirs of VALUES) {
          const forward = mergeValue(base, ours, theirs);
          const backward = mergeValue(base, theirs, ours, {
            winner: "theirs",
            onConflict: () => {},
          });
          expect(deepEqual(forward, backward)).toBe(true);
        }
      }
    }
  });
});

describe("mergeRecords: properties", () => {
  it("is mergeValue for each key, without keys with the value `undefined`", () => {
    const random = createRandom(71);
    const keys = ["bold", "italic", "textColor", "level"];
    const record = () =>
      Object.fromEntries(
        keys
          .filter(() => random.chance(0.6))
          .map((key) => [key, random.pick(VALUES.slice(0, 8))]),
      );
    for (let run = 0; run < 500; run++) {
      const base = record();
      const ours = random.chance(0.3) ? base : record();
      const theirs = random.chance(0.3) ? base : record();
      const result = mergeRecords(base, ours, theirs) as Record<
        string,
        unknown
      >;
      for (const key of keys) {
        expect(result[key]).toBe(mergeValue(base[key], ours[key], theirs[key]));
      }
      expect(Object.values(result)).not.toContain(undefined);
      if (deepEqual(base, ours)) {
        expect(deepEqual(result, theirs)).toBe(true);
      }
      if (deepEqual(base, theirs)) {
        expect(deepEqual(result, ours)).toBe(true);
      }
    }
  });

  it("gives an empty record for three empty records", () => {
    expect(mergeRecords({}, {}, {})).toEqual({});
  });

  it("removes a key that ours removed, if theirs did not change it", () => {
    expect(mergeRecords({ bold: true }, {}, { bold: true })).toEqual({});
  });

  it("keeps a key that theirs added, if ours did not have it", () => {
    expect(mergeRecords({}, {}, { underline: true })).toEqual({
      underline: true,
    });
  });
});
