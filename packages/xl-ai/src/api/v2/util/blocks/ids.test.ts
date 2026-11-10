// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";

import type { LensBlock } from "../../model.js";
import { createRandom, type Random } from "../../testUtil/random.js";
import { assertBlockIds, duplicateId } from "./ids.js";

function block(id: string, children: LensBlock[] = []): LensBlock {
  return { id, type: "paragraph", props: {}, content: [], children };
}

function ids(blocks: readonly LensBlock[]): string[] {
  return blocks.flatMap((child) => [child.id, ...ids(child.children)]);
}

/** A random tree with IDs from a small set. */
function randomTree(random: Random, depth = 0): LensBlock[] {
  return Array.from({ length: random.int(depth === 0 ? 6 : 3) }, () =>
    block(
      random.pick(["a", "b", "c", "d", "e", "f", "g", "h"]),
      depth < 2 ? randomTree(random, depth + 1) : [],
    ),
  );
}

describe("duplicateId", () => {
  it("gives the first ID that two blocks have, also at different levels", () => {
    expect(duplicateId([block("x", [block("y")]), block("y")])).toBe("y");
    expect(duplicateId([block("x", [block("x")])])).toBe("x");
  });

  it("gives undefined for distinct IDs", () => {
    expect(duplicateId([block("x", [block("y")]), block("z")])).toBeUndefined();
    expect(duplicateId([])).toBeUndefined();
  });

  it("agrees with a count of the IDs, for random trees", () => {
    const random = createRandom(151);
    for (let run = 0; run < 500; run++) {
      const blocks = randomTree(random);
      const all = ids(blocks);
      const repeated = all.find((id, i) => all.indexOf(id) !== i);
      expect(duplicateId(blocks), `run ${run}`).toBe(repeated);
    }
  });
});

describe("assertBlockIds", () => {
  // REVISIT: the lens throws for a document with two blocks with one ID (for
  // example a Y.Doc after two writers moved the same block). An earlier
  // version gave the later block the ID with a number (`x-2`).
  it("throws for two blocks with one ID, with the name of the document", () => {
    expect(() =>
      assertBlockIds([block("x"), block("x")], "current document"),
    ).toThrow("Two blocks of the current document have the ID x");
  });

  it("throws for a block without an ID", () => {
    expect(() => assertBlockIds([block("x", [block("")])], "base")).toThrow(
      "A block of the base has no ID",
    );
  });

  it("does not throw for distinct IDs", () => {
    expect(() =>
      assertBlockIds([block("x", [block("y")])], "base"),
    ).not.toThrow();
  });
});
