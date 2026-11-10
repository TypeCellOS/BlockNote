// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";

import type { LensBlock } from "../model.js";
import { createRandom, type Random } from "../testUtil/random.js";
import { mergeTree } from "./tree.js";

function block(
  id: string,
  text: string,
  children: LensBlock[] = [],
): LensBlock {
  return {
    id,
    type: "paragraph",
    props: {},
    content: [{ type: "text", text, styles: {} }],
    children,
  };
}

function merge(base: LensBlock[], ours: LensBlock[], theirs: LensBlock[]) {
  return mergeTree({
    base,
    ours,
    theirs,
    contentKindOf: () => "inline",
  });
}

/** A random tree with the IDs `b0`, `b1`, ... and a depth of at most 3. */
function randomTree(random: Random): LensBlock[] {
  let next = 0;
  function list(depth: number): LensBlock[] {
    const count =
      depth === 0 ? 1 + random.int(5) : random.chance(0.4) ? random.int(3) : 0;
    return Array.from({ length: count }, () => {
      const id = `b${next++}`;
      return block(id, `text of ${id}`, depth < 2 ? list(depth + 1) : []);
    });
  }
  return list(0);
}

function clone(blocks: readonly LensBlock[]): LensBlock[] {
  return structuredClone(blocks) as LensBlock[];
}

/** All lists of children in the tree, with the root list, and the block of each list. */
function lists(
  blocks: LensBlock[],
): { list: LensBlock[]; owner: LensBlock | undefined }[] {
  const result: { list: LensBlock[]; owner: LensBlock | undefined }[] = [
    { list: blocks, owner: undefined },
  ];
  const visit = (list: LensBlock[]) => {
    for (const child of list) {
      result.push({ list: child.children, owner: child });
      visit(child.children);
    }
  };
  visit(blocks);
  return result;
}

function allBlocks(blocks: readonly LensBlock[]): LensBlock[] {
  return blocks.flatMap((child) => [child, ...allBlocks(child.children)]);
}

function contains(root: LensBlock, id: string): boolean {
  return root.id === id || root.children.some((child) => contains(child, id));
}

/**
 * Applies 0 to 6 random edits of the given kinds: change a text (0), add (1),
 * remove (2) or move (3) a block. A removal does not remove a block of
 * `keep`, or a block with a block of `keep` in it.
 */
function edit(
  random: Random,
  blocks: readonly LensBlock[],
  prefix: string,
  kinds: readonly number[] = [0, 1, 2, 3],
  keep: ReadonlySet<string> = new Set(),
) {
  const result = clone(blocks);
  const count = random.int(7);
  for (let k = 0; k < count; k++) {
    const all = allBlocks(result);
    const kind = random.pick(kinds);
    if (kind === 0 && all.length > 0) {
      const target = random.pick(all);
      target.content = [
        { type: "text", text: `${prefix} text ${k}`, styles: {} },
      ];
    } else if (kind === 1) {
      const { list } = random.pick(lists(result));
      list.splice(
        random.int(list.length + 1),
        0,
        block(`${prefix}${k}`, `new ${prefix}${k}`),
      );
    } else if (kind === 2 && all.length > 0) {
      const { list } = random.pick(
        lists(result).filter(({ list }) => list.length > 0),
      );
      const at = random.int(list.length);
      if (!allBlocks([list[at]]).some((child) => keep.has(child.id))) {
        list.splice(at, 1);
      }
    } else if (all.length > 0) {
      const moved = random.pick(all);
      const from = lists(result).find(({ list }) => list.includes(moved))!;
      from.list.splice(from.list.indexOf(moved), 1);
      // Not into the block itself or into a block in it.
      const targets = lists(result).filter(
        ({ owner }) => owner === undefined || !contains(moved, owner.id),
      );
      const { list } = random.pick(targets);
      list.splice(random.int(list.length + 1), 0, moved);
    }
  }
  return result;
}

/** The IDs of the tree, with the nesting, and the text of each block. */
function shape(blocks: readonly LensBlock[]): unknown[] {
  return blocks.map((child) => [
    child.id,
    (child.content as { text: string }[]).map((item) => item.text).join(""),
    shape(child.children),
  ]);
}

const RUNS = 300;

describe("mergeTree: laws on random trees", () => {
  it("gives theirs, without warnings, if ours did not change", () => {
    const random = createRandom(91);
    for (let run = 0; run < RUNS; run++) {
      const base = randomTree(random);
      const theirs = edit(random, base, "t");
      const result = merge(base, clone(base), theirs);
      expect({ run, shape: shape(result.blocks) }).toEqual({
        run,
        shape: shape(theirs),
      });
      expect(result.warnings).toEqual([]);
    }
  });

  it("gives ours, without warnings, if theirs did not change", () => {
    const random = createRandom(92);
    for (let run = 0; run < RUNS; run++) {
      const base = randomTree(random);
      const ours = edit(random, base, "o");
      const result = merge(base, ours, clone(base));
      expect({ run, shape: shape(result.blocks) }).toEqual({
        run,
        shape: shape(ours),
      });
      expect(result.warnings).toEqual([]);
    }
  });

  it("gives the change one time, without warnings, if the two sides made the same change", () => {
    const random = createRandom(93);
    for (let run = 0; run < RUNS; run++) {
      const base = randomTree(random);
      const changed = edit(random, base, "o");
      const result = merge(base, changed, clone(changed));
      expect({ run, shape: shape(result.blocks) }).toEqual({
        run,
        shape: shape(changed),
      });
      expect(result.warnings).toEqual([]);
    }
  });

  it("does not throw, and gives each block one time, for random changes of the two sides", () => {
    const random = createRandom(94);
    for (let run = 0; run < 400; run++) {
      const base = randomTree(random);
      const ours = edit(random, base, "o");
      const theirs = edit(random, base, "t");
      let result: ReturnType<typeof merge> | undefined;
      expect(() => {
        result = merge(base, ours, theirs);
      }, `run ${run}`).not.toThrow();
      const ids = allBlocks(result!.blocks).map((child) => child.id);
      expect(new Set(ids).size).toBe(ids.length);
      const known = new Set(
        [...allBlocks(ours), ...allBlocks(theirs)].map((child) => child.id),
      );
      expect(ids.every((id) => known.has(id))).toBe(true);
      // Decision 1: a block of ours stays, unless theirs removed it.
      const theirIds = new Set(allBlocks(theirs).map((child) => child.id));
      const baseIds = new Set(allBlocks(base).map((child) => child.id));
      for (const child of allBlocks(ours)) {
        if (!baseIds.has(child.id) || theirIds.has(child.id)) {
          expect(ids, `run ${run}`).toContain(child.id);
        }
      }
    }
  });

  it("gives the structure of one side with the texts of the other side, without warnings, if one side changes only texts", () => {
    const random = createRandom(95);
    const textsOf = (blocks: readonly LensBlock[]) =>
      new Map(allBlocks(blocks).map((child) => [child.id, child.content]));
    for (let run = 0; run < RUNS; run++) {
      const base = randomTree(random);
      const textSide = edit(random, base, "x", [0]);
      const baseTexts = textsOf(base);
      const changed = new Set(
        [...textsOf(textSide)]
          .filter(
            ([id, content]) =>
              JSON.stringify(baseTexts.get(id)) !== JSON.stringify(content),
          )
          .map(([id]) => id),
      );
      // The other side does not remove the blocks with a changed text.
      const structureSide = edit(random, base, "s", [1, 2, 3], changed);
      const expected = clone(structureSide);
      const newTexts = textsOf(textSide);
      for (const child of allBlocks(expected)) {
        child.content = newTexts.get(child.id) ?? child.content;
      }
      for (const [ours, theirs] of [
        [textSide, structureSide],
        [structureSide, textSide],
      ]) {
        const result = merge(base, ours, theirs);
        expect({ run, shape: shape(result.blocks) }).toEqual({
          run,
          shape: shape(expected),
        });
        expect(result.warnings).toEqual([]);
      }
    }
  });
});
