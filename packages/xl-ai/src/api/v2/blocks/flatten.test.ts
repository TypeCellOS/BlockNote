import { describe, expect, it } from "vite-plus/test";

import { flattenBlocks } from "./flatten.js";
import type { LensBlock } from "./types.js";

function block(id: string, children: LensBlock[] = []): LensBlock {
  return { id, type: "paragraph", props: {}, content: [], children };
}

describe("flattenBlocks", () => {
  it("lists the blocks in pre-order, with the parent index", () => {
    const flat = flattenBlocks([
      block("a", [block("b", [block("c")]), block("d")]),
      block("e"),
    ]);

    expect(
      flat.map(({ block, parentIndex }) => [block.id, parentIndex]),
    ).toEqual([
      ["a", undefined],
      ["b", 0],
      ["c", 1],
      ["d", 0],
      ["e", undefined],
    ]);
  });

  it("removes the children from the listed blocks", () => {
    const [first] = flattenBlocks([block("a", [block("b")])]);
    expect(first.block.children).toEqual([]);
  });
});
