// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";

import type { FlatBlock, LensBlock } from "../model.js";
import { createRandom, type Random } from "../testUtil/random.js";
import { alignBlocks, alignmentKey, type BlockPair } from "./alignBlocks.js";

function paragraph(text: string): LensBlock {
  return {
    id: "",
    type: "paragraph",
    props: {},
    content: text === "" ? [] : [{ type: "text", text, styles: {} }],
    children: [],
  };
}

function image(url: string): LensBlock {
  return {
    id: "",
    type: "image",
    props: { url },
    content: undefined,
    children: [],
  };
}

function flat(...blocks: (string | LensBlock)[]): FlatBlock[] {
  return blocks.map((block) => ({
    block: typeof block === "string" ? paragraph(block) : block,
    parentIndex: undefined,
  }));
}

function sorted(pairs: readonly BlockPair[]) {
  return pairs
    .map((pair) => [pair.aIndex, pair.bIndex])
    .sort((x, y) => x[0] - y[0]);
}

const WORDS = ["alpha", "beta", "gamma", "delta", "x", "y", "zeta", "eta"];

/** A random block: mostly paragraphs with a few words, some empty paragraphs and images. */
function randomBlock(random: Random): string | LensBlock {
  if (random.chance(0.1)) {
    return image(random.pick(["a.png", "b.png"]));
  }
  if (random.chance(0.1)) {
    return "";
  }
  return Array.from({ length: 1 + random.int(4) }, () =>
    random.pick(WORDS),
  ).join(" ");
}

/** A random edit of a block list: change, remove, insert or move blocks. `make` gives a new block. */
function edit(
  random: Random,
  blocks: (string | LensBlock)[],
  make: (random: Random) => string | LensBlock = randomBlock,
) {
  const result = [...blocks];
  const count = random.int(4);
  for (let k = 0; k < count; k++) {
    const at = random.int(result.length + 1);
    switch (random.int(4)) {
      case 0:
        result.splice(at, 0, make(random));
        break;
      case 1:
        result.splice(at, 1);
        break;
      case 2:
        if (at < result.length) {
          result[at] = make(random);
        }
        break;
      default: {
        const [moved] = result.splice(at, 1);
        if (moved !== undefined) {
          result.splice(random.int(result.length + 1), 0, moved);
        }
      }
    }
  }
  return result;
}

/** Makes sure that the pairs are one to one, with valid indexes, and that the pairs that did not move do not cross. */
function expectValidPairs(
  pairs: readonly BlockPair[],
  aLength: number,
  bLength: number,
) {
  const seenA = new Set<number>();
  const seenB = new Set<number>();
  for (const pair of pairs) {
    expect(pair.aIndex).toBeGreaterThanOrEqual(0);
    expect(pair.aIndex).toBeLessThan(aLength);
    expect(pair.bIndex).toBeGreaterThanOrEqual(0);
    expect(pair.bIndex).toBeLessThan(bLength);
    expect(seenA.has(pair.aIndex)).toBe(false);
    expect(seenB.has(pair.bIndex)).toBe(false);
    seenA.add(pair.aIndex);
    seenB.add(pair.bIndex);
  }
  const fixed = pairs
    .filter((pair) => !pair.moved)
    .sort((x, y) => x.aIndex - y.aIndex);
  for (let i = 1; i < fixed.length; i++) {
    expect(fixed[i].bIndex).toBeGreaterThan(fixed[i - 1].bIndex);
  }
}

describe("alignBlocks: properties", () => {
  it("gives one-to-one pairs, and the pairs that did not move do not cross, for random edits", () => {
    const random = createRandom(51);
    for (let run = 0; run < 300; run++) {
      const before = Array.from({ length: random.int(10) }, () =>
        randomBlock(random),
      );
      const after = edit(random, before);
      const a = flat(...before);
      const b = flat(...after);
      expectValidPairs(alignBlocks(a, b), a.length, b.length);
    }
  });

  it("matches each block with itself for equal lists", () => {
    const random = createRandom(52);
    for (let run = 0; run < 100; run++) {
      const blocks = flat(
        ...Array.from({ length: random.int(12) }, () => randomBlock(random)),
      );
      expect(sorted(alignBlocks(blocks, blocks))).toEqual(
        blocks.map((_, i) => [i, i]),
      );
    }
  });

  it("matches two blocks with an equal text, if the key is in each list one time and the texts of the blocks have no words in common", () => {
    // Rule 1 (the key token is an anchor of the word diff) or rule 2 (a
    // moved block). The texts have no words in common, thus rule 1 cannot
    // match a block with a different block. (For texts with words in common,
    // see `alignBlocks.edge.test.ts`.)
    const random = createRandom(53);
    /** A block with one word from a small set, or an image. */
    const make = (random: Random) =>
      random.chance(0.15)
        ? image(random.pick(["a.png", "b.png"]))
        : `w${random.int(12)}`;
    for (let run = 0; run < 300; run++) {
      const before = Array.from({ length: random.int(10) }, () => make(random));
      const a = flat(...before);
      const b = flat(...edit(random, before, make));
      const keysA = a.map(({ block }) => alignmentKey(block));
      const keysB = b.map(({ block }) => alignmentKey(block));
      const pairs = alignBlocks(a, b);
      keysA.forEach((key, aIndex) => {
        const bIndex = keysB.indexOf(key);
        if (
          keysA.indexOf(key) === keysA.lastIndexOf(key) &&
          bIndex !== -1 &&
          bIndex === keysB.lastIndexOf(key)
        ) {
          expect(pairs).toContainEqual(
            expect.objectContaining({ aIndex, bIndex }),
          );
        }
      });
    }
  });

  it("gives no pairs if a list is empty", () => {
    expect(alignBlocks([], flat("a", "b"))).toEqual([]);
    expect(alignBlocks(flat("a", "b"), [])).toEqual([]);
    expect(alignBlocks([], [])).toEqual([]);
  });

  it("matches a block with one block, also if the texts have nothing in common", () => {
    // Rule 3: the only blocks, at the same position.
    expect(sorted(alignBlocks(flat("old"), flat("new")))).toEqual([[0, 0]]);
    // A different shape does not match.
    expect(alignBlocks(flat("old"), flat(image("a.png")))).toEqual([]);
  });
});
