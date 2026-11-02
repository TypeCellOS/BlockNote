import { describe, expect, it } from "vite-plus/test";

import { blockKey, deepEqual, stableStringify } from "./json.js";
import type { LensBlock } from "./types.js";

describe("deepEqual", () => {
  it("compares objects and arrays by value", () => {
    expect(deepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })).toBe(true);
    expect(deepEqual({ a: [1, 2] }, { a: [2, 1] })).toBe(false);
  });

  it("is the same for a key with the value `undefined` and no key", () => {
    expect(deepEqual({ bold: undefined }, {})).toBe(true);
    expect(deepEqual({}, { bold: undefined })).toBe(true);
    expect(deepEqual({ bold: false }, {})).toBe(false);
  });

  it("does not make an array equal to an object", () => {
    expect(deepEqual([], {})).toBe(false);
    expect(deepEqual(null, {})).toBe(false);
  });
});

describe("stableStringify", () => {
  it("gives the same string for values that are deeply equal", () => {
    expect(stableStringify({ b: 1, a: { d: 2, c: undefined } })).toBe(
      stableStringify({ a: { d: 2 }, b: 1 }),
    );
  });

  it("keeps the order of array items", () => {
    expect(stableStringify([1, 2])).not.toBe(stableStringify([2, 1]));
  });
});

describe("blockKey", () => {
  const block: LensBlock = {
    id: "a",
    type: "paragraph",
    props: { textColor: "red" },
    content: [{ type: "text", text: "a", styles: {} }],
    children: [],
  };

  it("is equal for blocks that differ only in ID and children", () => {
    const other: LensBlock = {
      ...block,
      id: "b",
      children: [{ ...block, id: "c" }],
    };
    expect(blockKey(block)).toBe(blockKey(other));
  });

  it("is different for a different prop", () => {
    expect(blockKey(block)).not.toBe(
      blockKey({ ...block, props: { textColor: "blue" } }),
    );
  });
});
