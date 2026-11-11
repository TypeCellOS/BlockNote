// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";

import { BlockIndex } from "./blockIndex.js";
import type { LensBlock } from "../../model.js";

function block(id: string, children: LensBlock[] = []): LensBlock {
  return { id, type: "paragraph", props: {}, content: [], children };
}

// a
//   b
//     c
//   d
// e
const document = [
  block("a", [block("b", [block("c")]), block("d")]),
  block("e"),
];

describe("BlockIndex", () => {
  it("knows the parent and the children of each block", () => {
    const index = new BlockIndex(document);
    expect(index.ids).toEqual(["a", "b", "c", "d", "e"]);
    expect(index.parent("c")).toBe("b");
    expect(index.parent("a")).toBeUndefined();
    expect(index.childrenOf("a")).toEqual(["b", "d"]);
    expect(index.childrenOf(undefined)).toEqual(["a", "e"]);
    expect(index.index("d")).toBe(1);
    expect(index.index("e")).toBe(1);
    expect(index.block("c")).toBe(document[0].children[0].children[0]);
    expect(index.has("x")).toBe(false);
  });
});
