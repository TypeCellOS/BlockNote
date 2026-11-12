// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";

import type { FlatBlock, LensBlock } from "../model.js";
import type { ViewBlock } from "../projection/projectDocument.js";
import { createRandom, type Random } from "../testUtil/random.js";
import { flattenBlocks } from "../util/blocks/flatten.js";
import { targetFromPairs } from "./targetFromPairs.js";

function paragraph(
  id: string,
  text: string,
  children: LensBlock[] = [],
): LensBlock {
  return {
    id,
    type: "paragraph",
    props: { textColor: "default" },
    content: [{ type: "text", text, styles: {} }],
    children,
  };
}

/** A random document with a depth of at most 3, and a hidden prop on some blocks. */
function randomDocument(random: Random): LensBlock[] {
  let next = 0;
  function list(depth: number): LensBlock[] {
    const count =
      depth === 0
        ? 1 + random.int(5)
        : random.chance(0.4)
          ? 1 + random.int(2)
          : 0;
    return Array.from({ length: count }, () => {
      const id = `b${next++}`;
      const block = paragraph(
        id,
        `text ${id}`,
        depth < 2 ? list(depth + 1) : [],
      );
      if (random.chance(0.3)) {
        block.props = { textColor: "red" };
      }
      return block;
    });
  }
  return list(0);
}

/** The view of a format: the blocks with their nesting, or all at the top level. Without the hidden prop. */
function viewOf(source: LensBlock[], flat: boolean): ViewBlock[] {
  return flattenBlocks(source).map(({ block, parentIndex }) => ({
    block: { ...block, id: "", props: { textColor: "default" } },
    parentIndex: flat ? undefined : parentIndex,
    sourceId: block.id,
  }));
}

function target(
  source: LensBlock[],
  view: ViewBlock[],
  textBlocks: FlatBlock[],
) {
  let count = 0;
  return targetFromPairs({
    source,
    projection: { view, invisibleIds: new Set() },
    textBlocks,
    // The text has the blocks of the view at the same positions.
    pairs: textBlocks.map((_, i) => ({ aIndex: i, bIndex: i })),
    contentKindOf: () => "inline",
    newId: () => `new${++count}`,
  });
}

describe("targetFromPairs: laws on random documents", () => {
  for (const flat of [false, true]) {
    const format = flat ? "a format without nesting" : "a format with nesting";

    it(`gives the source document if the text did not change (${format})`, () => {
      const random = createRandom(flat ? 181 : 182);
      for (let run = 0; run < 300; run++) {
        const source = randomDocument(random);
        const view = viewOf(source, flat);
        const textBlocks = view.map(({ block, parentIndex }) => ({
          block,
          parentIndex,
        }));
        const result = target(source, view, textBlocks);
        expect({ run, target: result.target }).toEqual({ run, target: source });
        expect(result.warnings).toEqual([]);
      }
    });

    it(`keeps the IDs, the hidden props and the nesting if the text changes only texts (${format})`, () => {
      const random = createRandom(flat ? 183 : 184);
      for (let run = 0; run < 300; run++) {
        const source = randomDocument(random);
        const view = viewOf(source, flat);
        const changed = new Set<number>();
        const textBlocks = view.map(({ block, parentIndex }, i) => {
          if (!random.chance(0.3)) {
            return { block, parentIndex };
          }
          changed.add(i);
          return {
            block: {
              ...block,
              content: [
                { type: "text" as const, text: `new ${i}`, styles: {} },
              ],
            },
            parentIndex,
          };
        });
        const expected = structuredClone(source) as LensBlock[];
        // The blocks in document order: the order of the view.
        const all = (blocks: LensBlock[]): LensBlock[] =>
          blocks.flatMap((child) => [child, ...all(child.children)]);
        all(expected).forEach((child, i) => {
          if (changed.has(i)) {
            child.content = [{ type: "text", text: `new ${i}`, styles: {} }];
          }
        });
        expect({
          run,
          target: target(source, view, textBlocks).target,
        }).toEqual({
          run,
          target: expected,
        });
      }
    });
  }

  it("removes a block that the text removes, and keeps its children in the format with nesting", () => {
    const random = createRandom(185);
    for (let run = 0; run < 300; run++) {
      const source = randomDocument(random);
      const view = viewOf(source, false);
      const removed = random.int(view.length);
      const kept = view.flatMap((_, i) => (i === removed ? [] : [i]));
      const textBlocks = kept.map((i) => ({
        block: view[i].block,
        parentIndex: undefined,
      }));
      let count = 0;
      const result = targetFromPairs({
        source,
        projection: { view, invisibleIds: new Set() },
        textBlocks,
        pairs: kept.map((aIndex, bIndex) => ({ aIndex, bIndex })),
        contentKindOf: () => "inline",
        newId: () => `new${++count}`,
      });
      const ids = flattenBlocks(result.target).map(({ block }) => block.id);
      expect(ids).toEqual(kept.map((i) => view[i].sourceId));
    }
  });
});
