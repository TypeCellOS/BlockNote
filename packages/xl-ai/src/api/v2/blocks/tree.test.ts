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
  it("knows the parent, the children and the siblings of each block", () => {
    const tree = new BlockTree(document);
    expect(tree.ids).toEqual(["a", "b", "c", "d", "e"]);
    expect(tree.parent("c")).toBe("b");
    expect(tree.parent("a")).toBeUndefined();
    expect(tree.childrenOf("a")).toEqual(["b", "d"]);
    expect(tree.childrenOf(undefined)).toEqual(["a", "e"]);
    expect(tree.previousSibling("d")).toBe("b");
    expect(tree.previousSibling("b")).toBeUndefined();
    expect(tree.block("c")).toBe(document[0].children[0].children[0]);
    expect(tree.has("x")).toBe(false);
  });

  it("finds the ancestors of a block", () => {
    const tree = new BlockTree(document);
    expect(tree.isWithin("c", "a")).toBe(true);
    expect(tree.isWithin("c", "c")).toBe(true);
    expect(tree.isWithin("c", "d")).toBe(false);
  });

  it("places a new block at each kind of position", () => {
    const tree = new BlockTree(document);
    tree.place("n1", { reference: "a", placement: "before" });
    tree.place("n2", { reference: "b", placement: "after" });
    tree.place("n3", { reference: "e", placement: "first-child" });
    tree.place("n4", { reference: "e", placement: "last-child" });

    expect(tree.ids).toEqual(["n1", "a", "b", "c", "n2", "d", "e", "n3", "n4"]);
    expect(tree.parent("n3")).toBe("e");
  });

  it("moves a block with its children", () => {
    const tree = new BlockTree(document);
    tree.place("b", { reference: "e", placement: "after" });

    expect(tree.ids).toEqual(["a", "d", "e", "b", "c"]);
    expect(tree.parent("b")).toBeUndefined();
  });

  it("tells if a block is at a position", () => {
    const tree = new BlockTree(document);
    expect(tree.isAt("d", { reference: "b", placement: "after" })).toBe(true);
    expect(tree.isAt("b", { reference: "d", placement: "before" })).toBe(true);
    expect(tree.isAt("b", { reference: "a", placement: "first-child" })).toBe(
      true,
    );
    expect(tree.isAt("d", { reference: "a", placement: "last-child" })).toBe(
      true,
    );
    expect(tree.isAt("d", { reference: "a", placement: "first-child" })).toBe(
      false,
    );
    expect(tree.isAt("e", { reference: "a", placement: "after" })).toBe(true);
  });

  it("removes a block with its descendants", () => {
    const tree = new BlockTree(document);
    tree.remove("a");

    expect(tree.ids).toEqual(["e"]);
    expect(tree.has("c")).toBe(false);
  });

  it("places a block at the start of the document, also of an empty document", () => {
    const tree = new BlockTree([block("a")]);
    tree.place("n", { placement: "start" });
    expect(tree.childrenOf(undefined)).toEqual(["n", "a"]);
    expect(tree.isAt("n", { placement: "start" })).toBe(true);

    const empty = new BlockTree([]);
    empty.place("m", { placement: "start" });
    expect(empty.childrenOf(undefined)).toEqual(["m"]);
  });
});
