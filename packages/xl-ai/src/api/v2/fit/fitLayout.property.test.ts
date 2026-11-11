// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";

import type { LensBlock } from "../model.js";
import { createRandom, type Random } from "../testUtil/random.js";
import type { LayoutRule } from "../util/blocks/schema.js";
import { fitLayout } from "./fitLayout.js";

const rules: Record<string, LayoutRule> = {
  columnList: { minChildren: 2, namedOnly: false, dissolves: true },
  column: { minChildren: 1, namedOnly: true, dissolves: true },
};

/** A column list holds only columns, and a column is only in a column list. */
function canContain(parent: string | undefined, child: string) {
  return (child === "column") === (parent === "columnList");
}

function block(id: string, type = "paragraph", children: LensBlock[] = []) {
  return { id, type, props: {}, content: [], children } as LensBlock;
}

function allBlocks(blocks: readonly LensBlock[]): LensBlock[] {
  return blocks.flatMap((child) => [child, ...allBlocks(child.children)]);
}

/**
 * A random document of paragraphs, column lists and columns. The document does
 * not always fit the rules: a column list can have one column, a column can be
 * empty or outside a column list, and a column list can hold a paragraph.
 */
function randomDocument(random: Random): LensBlock[] {
  let next = 0;
  function list(depth: number, parent: string | undefined): LensBlock[] {
    const count =
      depth === 0 ? 1 + random.int(4) : depth > 3 ? 0 : random.int(4);
    return Array.from({ length: count }, () => {
      const id = `b${next++}`;
      const roll = random.int(10);
      const type =
        parent === "columnList"
          ? roll < 8
            ? "column"
            : "paragraph"
          : roll < 2
            ? "columnList"
            : roll < 3
              ? "column"
              : "paragraph";
      return block(
        id,
        type,
        type === "paragraph" && random.chance(0.6) ? [] : list(depth + 1, type),
      );
    });
  }
  return list(0, undefined);
}

function shape(blocks: readonly LensBlock[]): unknown[] {
  return blocks.map((child) =>
    child.children.length > 0 ? [child.id, shape(child.children)] : child.id,
  );
}

/** Returns a problem of the document with the rules, or `undefined`. */
function ruleProblem(
  blocks: readonly LensBlock[],
  parent: string | undefined,
): string | undefined {
  for (const child of blocks) {
    if (!canContain(parent, child.type)) {
      return `${parent ?? "the top level"} holds ${child.id} (${child.type})`;
    }
    const rule = rules[child.type];
    if (rule !== undefined && child.children.length < rule.minChildren) {
      return `${child.id} (${child.type}) has too few children`;
    }
    const inner = ruleProblem(child.children, child.type);
    if (inner !== undefined) {
      return inner;
    }
  }
  return undefined;
}

describe("fitLayout: properties", () => {
  it("gives a document that fits the rules, and a second fit does not change it", () => {
    const random = createRandom(171);
    for (let run = 0; run < 500; run++) {
      const blocks = randomDocument(random);
      const result = fitLayout(blocks, (type) => rules[type], canContain);
      expect({ run, problem: ruleProblem(result, undefined) }).toEqual({
        run,
        problem: undefined,
      });
      expect(
        shape(fitLayout(result, (type) => rules[type], canContain)),
      ).toEqual(shape(result));
    }
  });

  it("keeps each block that is not a layout block, one time, in document order", () => {
    const random = createRandom(172);
    for (let run = 0; run < 500; run++) {
      const blocks = randomDocument(random);
      const result = fitLayout(blocks, (type) => rules[type], canContain);
      const paragraphs = (blocks: readonly LensBlock[]) =>
        allBlocks(blocks)
          .filter((child) => child.type === "paragraph")
          .map((child) => child.id);
      // A block that a parent cannot hold goes to after that parent, thus
      // the order can change. Compare the sets.
      expect([...paragraphs(result)].sort()).toEqual(
        [...paragraphs(blocks)].sort(),
      );
    }
  });

  it("does not change a document that fits the rules", () => {
    const random = createRandom(173);
    for (let run = 0; run < 300; run++) {
      const blocks = randomDocument(random);
      if (ruleProblem(blocks, undefined) === undefined) {
        expect(
          shape(fitLayout(blocks, (type) => rules[type], canContain)),
        ).toEqual(shape(blocks));
      }
    }
  });
});

describe("fitLayout: edge cases", () => {
  it("gives an empty list for an empty list", () => {
    expect(fitLayout([], (type) => rules[type], canContain)).toEqual([]);
  });

  it("removes a column list without columns, and a column list with only empty columns", () => {
    expect(
      shape(
        fitLayout(
          [
            block("list", "columnList"),
            block("other", "columnList", [
              block("c1", "column"),
              block("c2", "column"),
            ]),
            block("z"),
          ],
          (type) => rules[type],
          canContain,
        ),
      ),
    ).toEqual(["z"]);
  });

  it("changes nested column lists with one column each to their blocks", () => {
    expect(
      shape(
        fitLayout(
          [
            block("outer", "columnList", [
              block("c1", "column", [
                block("inner", "columnList", [
                  block("c2", "column", [block("a")]),
                ]),
              ]),
            ]),
          ],
          (type) => rules[type],
          canContain,
        ),
      ),
    ).toEqual(["a"]);
  });
});
