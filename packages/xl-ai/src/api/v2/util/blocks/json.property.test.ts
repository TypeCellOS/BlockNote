// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";

import { createRandom, type Random } from "../../testUtil/random.js";
import { deepEqual, stableStringify } from "./json.js";

/** A random JSON value, with some keys with the value `undefined`. */
function randomValue(random: Random, depth = 0): unknown {
  const kind = random.int(depth > 2 ? 4 : 6);
  switch (kind) {
    case 0:
      return random.pick([0, 1, -1, 2.5]);
    case 1:
      return random.pick(["", "a", "b"]);
    case 2:
      return random.pick([true, false, null]);
    case 3:
      return undefined;
    case 4:
      return Array.from({ length: random.int(3) }, () =>
        randomValue(random, depth + 1),
      );
    default:
      return Object.fromEntries(
        Array.from({ length: random.int(3) }, () => [
          random.pick(["x", "y", "z"]),
          randomValue(random, depth + 1),
        ]),
      );
  }
}

/** The value with its object keys in the reverse order. */
function reversedKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(reversedKeys);
  }
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .reverse()
        .map(([key, item]) => [key, reversedKeys(item)]),
    );
  }
  return value;
}

describe("deepEqual and stableStringify: properties", () => {
  it("gives the same string for two values that are deeply equal", () => {
    const random = createRandom(141);
    let equalPairs = 0;
    for (let run = 0; run < 3000; run++) {
      const a = randomValue(random);
      const b = random.chance(0.3) ? reversedKeys(a) : randomValue(random);
      if (deepEqual(a, b)) {
        equalPairs++;
        expect(stableStringify(a)).toBe(stableStringify(b));
      }
    }
    expect(equalPairs).toBeGreaterThan(500);
  });

  it("is reflexive and symmetric", () => {
    const random = createRandom(142);
    for (let run = 0; run < 1000; run++) {
      const a = randomValue(random);
      const b = randomValue(random);
      expect(deepEqual(a, structuredClone(a))).toBe(true);
      expect(deepEqual(a, b)).toBe(deepEqual(b, a));
    }
  });
});

describe("deepEqual and stableStringify: edge cases", () => {
  it("gives the same string for an array item `undefined` and `null`, but deepEqual is false", () => {
    // JSON writes an array item `undefined` as `null`. Thus, the string is
    // not a full key of a value with `undefined` in an array. Block JSON has
    // no such arrays.
    expect(deepEqual([undefined], [null])).toBe(false);
    expect(stableStringify([undefined])).toBe(stableStringify([null]));
  });

  it("does not make NaN equal to itself", () => {
    // Block JSON has no NaN (`propsFit` accepts only finite numbers).
    expect(deepEqual(Number.NaN, Number.NaN)).toBe(false);
  });

  it("does not give a string for `undefined`", () => {
    expect(stableStringify(undefined)).toBeUndefined();
  });

  it("does not compare the order of object keys", () => {
    expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
    expect(stableStringify({ a: 1, b: 2 })).toBe(
      stableStringify({ b: 2, a: 1 }),
    );
  });
});
