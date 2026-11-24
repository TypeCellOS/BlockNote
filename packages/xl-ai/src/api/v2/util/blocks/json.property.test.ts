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
  it("gives the same string for two values if and only if they are deeply equal", () => {
    const random = createRandom(141);
    let equalPairs = 0;
    for (let run = 0; run < 3000; run++) {
      const a = randomValue(random);
      const b = random.chance(0.3) ? reversedKeys(a) : randomValue(random);
      const equal = deepEqual(a, b);
      if (equal) {
        equalPairs++;
      }
      expect(stableStringify(a) === stableStringify(b)).toBe(equal);
    }
    expect(equalPairs).toBeGreaterThan(500);
  });

  it("makes a value equal to its copy through JSON", () => {
    // A store keeps a document as JSON. The copy must be the same document.
    const random = createRandom(143);
    for (let run = 0; run < 1000; run++) {
      // JSON has no top-level `undefined`.
      const value = randomValue(random) ?? null;
      expect(deepEqual(value, JSON.parse(JSON.stringify(value)))).toBe(true);
    }
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
  it("makes an array item `undefined` equal to `null`, with the same string", () => {
    // JSON writes an array item `undefined` as `null`. Block JSON has such
    // arrays: the column widths of a table (`[undefined, undefined]` from
    // the editor, `[null, null]` from a store that keeps JSON).
    expect(deepEqual([undefined], [null])).toBe(true);
    expect(deepEqual([[undefined, 1]], [[null, 1]])).toBe(true);
    expect(stableStringify([undefined])).toBe(stableStringify([null]));
  });

  it("does not make an object value `undefined` equal to `null`", () => {
    // JSON drops a key with the value `undefined`, and keeps `null`.
    expect(deepEqual({ a: undefined }, { a: null })).toBe(false);
    expect(stableStringify({ a: undefined })).not.toBe(
      stableStringify({ a: null }),
    );
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
