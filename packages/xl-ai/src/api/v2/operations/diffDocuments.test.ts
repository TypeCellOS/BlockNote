// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";

import type { LensBlock } from "../blocks/types.js";
import { diffDocuments } from "./diffDocuments.js";

function content(text: string) {
  return [{ type: "text" as const, text, styles: {} }];
}

function block(id: string, text = id, children: LensBlock[] = []): LensBlock {
  return { id, type: "paragraph", props: {}, content: content(text), children };
}

describe("diffDocuments", () => {
  it("gives no operations for equal documents", () => {
    const document = [block("a", "A", [block("b")]), block("c")];
    expect(diffDocuments(document, document)).toEqual([]);
  });

  it("updates the changed fields of a block", () => {
    expect(diffDocuments([block("a")], [block("a", "A2")])).toEqual([
      { type: "update", id: "a", update: { content: content("A2") } },
    ]);
  });

  it("inserts a new block after the block before it", () => {
    expect(
      diffDocuments(
        [block("a"), block("b")],
        [block("a"), block("n"), block("b")],
      ),
    ).toEqual([
      { type: "insert", block: block("n"), reference: "a", placement: "after" },
    ]);
  });

  it("inserts a new first block at the start of the document", () => {
    expect(
      diffDocuments(
        [block("a"), block("b")],
        [block("n"), block("a"), block("b")],
      ),
    ).toEqual([{ type: "insert", block: block("n"), placement: "start" }]);
  });

  it("inserts a new block with its new children in one operation", () => {
    expect(
      diffDocuments([block("a")], [block("a"), block("n", "n", [block("c")])]),
    ).toEqual([
      {
        type: "insert",
        block: block("n", "n", [block("c")]),
        reference: "a",
        placement: "after",
      },
    ]);
  });

  it("inserts a new block without children if a child is an existing block", () => {
    expect(
      diffDocuments(
        [block("a"), block("e")],
        [block("a"), block("n", "n", [block("c"), block("e")])],
      ),
    ).toEqual([
      { type: "insert", block: block("n"), reference: "a", placement: "after" },
      {
        type: "insert",
        block: block("c"),
        reference: "n",
        placement: "first-child",
      },
      { type: "move", id: "e", reference: "c", placement: "after" },
    ]);
  });

  it("moves only the blocks that do not keep their order", () => {
    expect(
      diffDocuments(
        [block("a"), block("b"), block("c")],
        [block("c"), block("a"), block("b")],
      ),
    ).toEqual([{ type: "move", id: "c", placement: "start" }]);
  });

  it("moves a block to a different parent", () => {
    expect(
      diffDocuments([block("p"), block("c")], [block("p", "p", [block("c")])]),
    ).toEqual([
      { type: "move", id: "c", reference: "p", placement: "first-child" },
    ]);
  });

  it("removes the highest removed blocks, after the moves out of them", () => {
    expect(
      diffDocuments(
        [block("p", "p", [block("c"), block("d")]), block("e")],
        [block("c"), block("e")],
      ),
    ).toEqual([
      { type: "move", id: "c", placement: "start" },
      { type: "delete", id: "p" },
    ]);
  });
});
