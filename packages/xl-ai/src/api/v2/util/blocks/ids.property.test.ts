// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";

import type { LensBlock } from "../../model.js";
import { createRandom, type Random } from "../../testUtil/random.js";
import { distinctId, withDistinctIds } from "./ids.js";

function block(id: string, children: LensBlock[] = []): LensBlock {
  return { id, type: "paragraph", props: {}, content: [], children };
}

function ids(blocks: readonly LensBlock[]): string[] {
  return blocks.flatMap((child) => [child.id, ...ids(child.children)]);
}

/** A random tree with IDs from a small set, also IDs like `a-2`. */
function randomTree(random: Random, depth = 0): LensBlock[] {
  return Array.from({ length: random.int(depth === 0 ? 6 : 3) }, () =>
    block(
      random.pick(["a", "a-2", "a-2-2", "b", "a-3", ""]),
      depth < 2 ? randomTree(random, depth + 1) : [],
    ),
  );
}

describe("withDistinctIds: properties", () => {
  it("gives distinct IDs, keeps the first block with each ID, and a second call does not change the result", () => {
    const random = createRandom(151);
    for (let run = 0; run < 500; run++) {
      const blocks = randomTree(random);
      const result = withDistinctIds(blocks);
      const before = ids(blocks);
      const after = ids(result);
      expect(new Set(after).size).toBe(after.length);
      expect(after).toHaveLength(before.length);
      // The first block keeps its ID. Each block keeps its ID, or gets its
      // ID with a number.
      expect(after[0]).toBe(before[0]);
      before.forEach((id, i) => {
        expect(after[i] === id || after[i].startsWith(`${id}-`)).toBe(true);
      });
      expect(withDistinctIds(result)).toEqual(result);
    }
  });

  it("keeps the first block of the document with each ID", () => {
    expect(
      ids(withDistinctIds([block("a"), block("a", [block("a")])])),
    ).toEqual(["a", "a-2", "a-3"]);
  });

  it("gives a distinct ID also if the ID with a number is in the document before", () => {
    expect(
      ids(withDistinctIds([block("a-2"), block("a"), block("a")])),
    ).toEqual(["a-2", "a", "a-3"]);
  });

  it("gives an empty ID a number too", () => {
    expect(ids(withDistinctIds([block(""), block("")]))).toEqual(["", "-2"]);
  });
});

describe("distinctId", () => {
  it("never gives an ID that is in the set", () => {
    const used = new Set(["a", "a-2", "a-3", "a-5"]);
    expect(distinctId("a", used)).toBe("a-4");
    expect(distinctId("b", used)).toBe("b");
  });
});
