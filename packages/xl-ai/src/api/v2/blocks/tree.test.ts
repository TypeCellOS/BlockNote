// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";

import { BlockTree } from "./tree.js";
import type { LensBlock } from "./types.js";

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

describe("BlockTree", () => {
  it("knows the parent and the children of each block", () => {
    const tree = new BlockTree(document);
    expect(tree.ids).toEqual(["a", "b", "c", "d", "e"]);
    expect(tree.parent("c")).toBe("b");
    expect(tree.parent("a")).toBeUndefined();
    expect(tree.childrenOf("a")).toEqual(["b", "d"]);
    expect(tree.childrenOf(undefined)).toEqual(["a", "e"]);
    expect(tree.index("d")).toBe(1);
    expect(tree.index("e")).toBe(1);
    expect(tree.block("c")).toBe(document[0].children[0].children[0]);
    expect(tree.has("x")).toBe(false);
  });
});
