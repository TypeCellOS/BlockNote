// @vitest-environment node
import { describe, expect, it } from "vite-plus/test";

import type { LensBlock } from "../model.js";
import { createRandom, type Random } from "../testUtil/random.js";
import { applyToBlocks, type BlockShape } from "./applyToBlocks.js";
import { diffDocuments } from "./diffDocuments.js";
import type { BlockOperation } from "./types.js";

function block(
  id: string,
  text: string,
  children: LensBlock[] = [],
  props: Record<string, unknown> = { color: "default" },
  type = "paragraph",
): LensBlock {
  return {
    id,
    type,
    props,
    content: [{ type: "text", text, styles: {} }],
    children,
  };
}

function clone(blocks: readonly LensBlock[]): LensBlock[] {
  return structuredClone(blocks) as LensBlock[];
}

function allBlocks(blocks: readonly LensBlock[]): LensBlock[] {
  return blocks.flatMap((child) => [child, ...allBlocks(child.children)]);
}

function lists(blocks: LensBlock[]) {
  const result: { list: LensBlock[]; owner: LensBlock | undefined }[] = [
    { list: blocks, owner: undefined },
  ];
  for (const child of allBlocks(blocks)) {
    result.push({ list: child.children, owner: child });
  }
  return result;
}

function contains(root: LensBlock, id: string): boolean {
  return root.id === id || root.children.some((child) => contains(child, id));
}

/** A random tree with the IDs `b0`, `b1`, ... and a depth of at most 3. */
function randomTree(random: Random): LensBlock[] {
  let next = 0;
  function list(depth: number): LensBlock[] {
    const count =
      depth === 0 ? random.int(6) : random.chance(0.4) ? random.int(3) : 0;
    return Array.from({ length: count }, () => {
      const id = `b${next++}`;
      return block(id, id, depth < 2 ? list(depth + 1) : []);
    });
  }
  return list(0);
}

/** Random edits: fields, new blocks (also with new children), removals and moves. */
function edit(random: Random, blocks: readonly LensBlock[]) {
  const result = clone(blocks);
  const count = random.int(8);
  for (let k = 0; k < count; k++) {
    const all = allBlocks(result);
    const kind = random.int(6);
    if (kind === 0 && all.length > 0) {
      random.pick(all).content = [
        { type: "text", text: `changed ${k}`, styles: {} },
      ];
    } else if (kind === 1 && all.length > 0) {
      const changed = random.pick(all);
      changed.props = { ...changed.props, color: random.pick(["red", "blue"]) };
    } else if (kind === 2 && all.length > 0) {
      const changed = random.pick(all);
      changed.type = random.pick(["heading", "quote"]);
      changed.props = { level: 2 };
    } else if (kind === 3) {
      const { list } = random.pick(lists(result));
      const children = random.chance(0.3) ? [block(`n${k}c`, "child")] : [];
      list.splice(
        random.int(list.length + 1),
        0,
        block(`n${k}`, "new", children),
      );
    } else if (kind === 4 && all.length > 0) {
      const { list } = random.pick(
        lists(result).filter(({ list }) => list.length > 0),
      );
      list.splice(random.int(list.length), 1);
    } else if (all.length > 0) {
      const moved = random.pick(all);
      const from = lists(result).find(({ list }) => list.includes(moved))!;
      from.list.splice(from.list.indexOf(moved), 1);
      const targets = lists(result).filter(
        ({ owner }) => owner === undefined || !contains(moved, owner.id),
      );
      const { list } = random.pick(targets);
      list.splice(random.int(list.length + 1), 0, moved);
    }
  }
  return result;
}

/** Applies the operations: the structure with `applyToBlocks`, and the updates as `updateBlock` does. */
function apply(
  document: readonly LensBlock[],
  operations: readonly BlockOperation[],
): LensBlock[] {
  const fields = new Map(
    allBlocks(document).map((child) => [
      child.id,
      { type: child.type, props: child.props, content: child.content },
    ]),
  );
  for (const operation of operations) {
    if (operation.type === "update") {
      const before = fields.get(operation.id);
      expect(before, `update of ${operation.id}`).toBeDefined();
      const { update } = operation;
      fields.set(operation.id, {
        type: update.type ?? before!.type,
        props:
          update.type !== undefined
            ? (update.props ?? {})
            : { ...before!.props, ...update.props },
        content: "content" in update ? update.content : before!.content,
      });
    }
  }
  const build = (shapes: readonly BlockShape[]): LensBlock[] =>
    shapes.map((shape) => ({
      id: shape.block.id,
      ...(fields.get(shape.block.id) ?? {
        type: shape.block.type,
        props: shape.block.props,
        content: shape.block.content,
      }),
      children: build(shape.children),
    }));
  return build(applyToBlocks(document, operations));
}

describe("diffDocuments: properties", () => {
  it("gives operations that change the current document into the target", () => {
    const random = createRandom(101);
    for (let run = 0; run < 500; run++) {
      const current = randomTree(random);
      const target = edit(random, current);
      const operations = diffDocuments(current, target);
      expect({ run, result: apply(current, operations) }).toEqual({
        run,
        result: target,
      });
    }
  });

  it("gives no operations for equal documents", () => {
    const random = createRandom(102);
    for (let run = 0; run < 100; run++) {
      const document = randomTree(random);
      expect(diffDocuments(document, clone(document))).toEqual([]);
    }
  });

  it("refers only to blocks that exist when the operation runs, and deletes come last", () => {
    const random = createRandom(103);
    for (let run = 0; run < 300; run++) {
      const current = randomTree(random);
      const target = edit(random, current);
      const operations = diffDocuments(current, target);
      const existing = new Set(allBlocks(current).map((child) => child.id));
      let deleting = false;
      for (const operation of operations) {
        if (operation.type === "delete") {
          deleting = true;
        } else {
          expect(deleting).toBe(false);
        }
        if ("reference" in operation) {
          expect(existing.has(operation.reference)).toBe(true);
        }
        if (operation.type === "move" || operation.type === "update") {
          expect(existing.has(operation.id)).toBe(true);
        }
        if (operation.type === "insert") {
          expect(existing.has(operation.block.id)).toBe(false);
          for (const child of allBlocks([operation.block])) {
            existing.add(child.id);
          }
        }
      }
    }
  });

  it("does not move a block that keeps its parent and its order with the other blocks that stay there", () => {
    // Only one block moves: all other blocks keep their order.
    const random = createRandom(104);
    for (let run = 0; run < 200; run++) {
      const current = Array.from({ length: 2 + random.int(8) }, (_, i) =>
        block(`b${i}`, `b${i}`),
      );
      const target = clone(current);
      const [moved] = target.splice(random.int(target.length), 1);
      target.splice(random.int(target.length + 1), 0, moved);
      const operations = diffDocuments(current, target);
      expect(operations.length).toBeLessThanOrEqual(1);
      expect(apply(current, operations)).toEqual(target);
    }
  });
});

describe("diffDocuments: edge cases", () => {
  it("removes all blocks of a document", () => {
    const current = [block("a", "a", [block("b", "b")]), block("c", "c")];
    expect(diffDocuments(current, [])).toEqual([
      { type: "delete", id: "a" },
      { type: "delete", id: "c" },
    ]);
  });

  it("inserts all blocks of an empty document, from the start", () => {
    const target = [block("a", "a"), block("b", "b")];
    expect(diffDocuments([], target)).toEqual([
      { type: "insert", block: target[0], placement: "start" },
      { type: "insert", block: target[1], reference: "a", placement: "after" },
    ]);
  });

  it("swaps a parent and its child", () => {
    const current = [block("a", "a", [block("b", "b")])];
    const target = [block("b", "b", [block("a", "a")])];
    expect(apply(current, diffDocuments(current, target))).toEqual(target);
  });

  it("reverses a deep chain of blocks", () => {
    const current = [block("a", "a", [block("b", "b", [block("c", "c")])])];
    const target = [block("c", "c", [block("b", "b", [block("a", "a")])])];
    expect(apply(current, diffDocuments(current, target))).toEqual(target);
  });
});
