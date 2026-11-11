import type { ContentKind, LensBlock } from "../model.js";
import {
  BlockTree,
  deepEqual,
  diffBlock,
  withoutChildren,
} from "../util/blocks/index.js";
import { type MatchedPair, myersMatch } from "../util/sequence/index.js";
import { mergeBlock } from "./block.js";
import { diff3 } from "./diff3.js";
import { mergeValue } from "./threeWay.js";

export type MergeWarning =
  /** The client changed or moved a block that another writer removed. The change does not apply. */
  | { type: "change-to-removed-block"; id: string }
  /**
   * The client removed a block that another writer changed (or a block in
   * it). The removal does not apply to that block and to the blocks in it
   * that another writer changed: they stay.
   */
  | { type: "removed-changed-block"; id: string }
  /**
   * The client and another writer changed the same part of a block (a part
   * of its text, a style, a prop, its parent or its place) in different
   * ways. The change of the other writer stays there, and the change of the
   * client there does not apply. An example is a sentence that another
   * writer removed and the client changed.
   */
  | { type: "conflicting-change"; id: string };

/**
 * Three-way merge of block trees, by block ID. `base` is the document that
 * the client read, `ours` is the document that the client wants (the
 * target), and `theirs` is the current document, with the changes of other
 * writers. The result keeps the changes of the two sides. The merge decides
 * in this order:
 *
 * 1. Which blocks stay (see {@link stayingBlocks}).
 * 2. The parent of each block (see {@link mergeParents}).
 * 3. The order of the children of each parent (see {@link mergeChildOrder}).
 * 4. The fields of each block: a three-way merge (see `mergeBlock`).
 *
 * If both sides changed the same part in different ways (a conflict), the
 * part of `theirs` wins, and the block gets the warning `conflicting-change`
 * (see `MergeOptions`).
 *
 * The merge does not know the schema. The fit of the result moves a block
 * that its parent cannot hold (see `fitLayout`). For example, a new
 * paragraph of the client in a column that another writer removed is in the
 * column list.
 *
 * Method: our own design. Step 3 uses diff3 on the lists of child IDs, and step
 * 4 the three-way rule.
 */
export function mergeTree(input: {
  base: readonly LensBlock[];
  ours: readonly LensBlock[];
  theirs: readonly LensBlock[];
  contentKindOf: (type: string) => ContentKind;
}): { blocks: LensBlock[]; warnings: MergeWarning[] } {
  const sides = new Sides(
    new BlockTree(input.base),
    new BlockTree(input.ours),
    new BlockTree(input.theirs),
  );
  const staying = stayingBlocks(sides);
  const parents = mergeParents(sides, staying);
  const children = mergeChildOrders(sides, staying, parents.parentOf);
  const conflicts = new Set([...parents.conflicts, ...children.conflicts]);

  const warnings: MergeWarning[] = [];
  function build(parent: string | undefined): LensBlock[] {
    return (children.childrenOf.get(parent) ?? []).map((id) => {
      const fields = mergeFields(sides, id, input.contentKindOf);
      if (fields.conflict || conflicts.has(id)) {
        warnings.push({ type: "conflicting-change", id });
      }
      return { ...fields.block, children: build(id) };
    });
  }
  const blocks = build(undefined);
  return { blocks, warnings: [...warnings, ...removalWarnings(sides)] };
}

/** The three sides of the merge, and the questions that the decisions ask about them. */
class Sides {
  private readonly changedMemo = new Map<string, boolean>();

  constructor(
    readonly base: BlockTree,
    readonly ours: BlockTree,
    readonly theirs: BlockTree,
  ) {}

  /**
   * Returns true if another writer changed the block, or a block in it that
   * the client also removed (also a new block). Thus, the removal of the
   * block by the client loses that change. A block in it that the client
   * keeps (for example moves out) does not count.
   */
  changedByOthers(id: string): boolean {
    let result = this.changedMemo.get(id);
    if (result === undefined) {
      result =
        !this.base.has(id) ||
        !deepEqual(
          withoutChildren(this.theirs.block(id)),
          withoutChildren(this.base.block(id)),
        ) ||
        this.theirs
          .childrenOf(id)
          .some(
            (child) => !this.ours.has(child) && this.changedByOthers(child),
          );
      this.changedMemo.set(id, result);
    }
    return result;
  }

  /** Returns true if the client changed the fields, the parent or the place of the block. */
  changedByClient(id: string): boolean {
    return (
      diffBlock(this.base.block(id), this.ours.block(id)) !== undefined ||
      this.movedByClient(id)
    );
  }

  /** Returns true if the client changed the parent or the place of a block of base. */
  movedByClient(id: string): boolean {
    return (
      this.base.has(id) &&
      this.ours.has(id) &&
      (this.ours.parent(id) !== this.base.parent(id) ||
        this.previousKept(this.ours, id) !== this.previousKept(this.base, id))
    );
  }

  /**
   * The previous sibling of the block in the side, of the blocks that base
   * and `ours` both have. Thus, a new block or a removed block next to the
   * block is not a move of it.
   */
  private previousKept(side: BlockTree, id: string): string | undefined {
    const siblings = side.childrenOf(side.parent(id));
    for (let i = side.index(id) - 1; i >= 0; i--) {
      if (this.base.has(siblings[i]) && this.ours.has(siblings[i])) {
        return siblings[i];
      }
    }
    return undefined;
  }
}

/** The blocks that stay, in the order of `theirs`, then of `ours` (see {@link stayingBlocks}). */
type Staying = { list: string[]; has: (id: string) => boolean };

/**
 * Decision 1: which blocks stay.
 *
 * - A block of `ours` stays, unless another writer removed it.
 * - A new block of another writer stays if its parent stays.
 * - A block that the client removed goes, unless another writer changed it
 *   or a removed block in it: then it stays. A write from an older version
 *   does not remove a change that it did not see. The other blocks in it
 *   that the client removed go.
 */
function stayingBlocks(sides: Sides): Staying {
  const { base, ours, theirs } = sides;
  const memo = new Map<string, boolean>();
  function stays(id: string): boolean {
    let result = memo.get(id);
    if (result === undefined) {
      if (ours.has(id)) {
        result = !base.has(id) || theirs.has(id);
      } else if (!theirs.has(id)) {
        result = false;
      } else if (base.has(id)) {
        result = sides.changedByOthers(id);
      } else {
        const parent = theirs.parent(id);
        result = parent === undefined || stays(parent);
      }
      memo.set(id, result);
    }
    return result;
  }
  return {
    list: [...new Set([...theirs.ids, ...ours.ids])].filter(stays),
    has: stays,
  };
}

/**
 * Decision 2: the parent of each block that stays.
 *
 * - The parent is a three-way merge (see `mergeValue`). A conflict there is
 *   a conflict of the block.
 * - If that parent goes, the block goes to the place of that parent.
 * - If the parents of the two sides make a cycle (each side moved a block
 *   into the other), the parents of `theirs` win (see `breakCycles`).
 */
function mergeParents(
  sides: Sides,
  staying: Staying,
): {
  parentOf: Map<string, string | undefined>;
  /** The blocks with a conflict of the parent: a change of the client there does not apply. */
  conflicts: Set<string>;
} {
  const { base, ours, theirs } = sides;
  const conflicts = new Set<string>();
  /** The blocks that get the parent of `theirs`, to break a cycle. */
  const theirsWins = new Set<string>();

  /** The parent that the merge gives the block, before a parent that goes is replaced. */
  function chosenParent(id: string): string | undefined {
    if (!theirs.has(id)) {
      return (ours.has(id) ? ours : base).parent(id);
    }
    if (!ours.has(id) || !base.has(id) || theirsWins.has(id)) {
      return theirs.parent(id);
    }
    return mergeValue(base.parent(id), ours.parent(id), theirs.parent(id), {
      concurrent: true,
      onConflict: () => conflicts.add(id),
    });
  }

  /** The parent in the result: the chosen parent, or the place of a chosen parent that goes. */
  function parentOf(id: string): string | undefined {
    let parent = chosenParent(id);
    while (parent !== undefined && !staying.has(parent)) {
      parent = chosenParent(parent);
    }
    return parent;
  }

  /**
   * Gives the parent of `theirs` to each block of `theirs` on a cycle of
   * parents. A cycle needs a parent of `ours` that is not the parent of
   * `theirs` (each side alone is a tree). Thus, each round removes the cycles
   * that it finds. Each round walks up from each block one time: a block
   * that a walk passed is not walked again.
   */
  function breakCycles() {
    for (let changed = true; changed;) {
      changed = false;
      /** The walk that passed each block. */
      const walkOf = new Map<string, number>();
      staying.list.forEach((id, walk) => {
        const path: string[] = [];
        let current: string | undefined = id;
        while (current !== undefined && !walkOf.has(current)) {
          walkOf.set(current, walk);
          path.push(current);
          current = parentOf(current);
        }
        if (current === undefined || walkOf.get(current) !== walk) {
          // The top level, or a block of an earlier walk: no new cycle.
          return;
        }
        for (const block of path.slice(path.indexOf(current))) {
          if (theirs.has(block) && !theirsWins.has(block)) {
            theirsWins.add(block);
            changed = true;
            if (
              sides.movedByClient(block) &&
              ours.parent(block) !== theirs.parent(block)
            ) {
              conflicts.add(block);
            }
          }
        }
      });
    }
  }

  breakCycles();
  return {
    parentOf: new Map(staying.list.map((id) => [id, parentOf(id)])),
    conflicts,
  };
}

/**
 * Decision 3: the order of the children of each parent (see
 * {@link mergeChildOrder}).
 */
function mergeChildOrders(
  sides: Sides,
  staying: Staying,
  parentOf: ReadonlyMap<string, string | undefined>,
): {
  childrenOf: Map<string | undefined, string[]>;
  /** The blocks that the two sides moved to different places in one list. */
  conflicts: Set<string>;
} {
  /** The children of each parent in the result, in no order yet. */
  const expected = new Map<string | undefined, string[]>();
  for (const id of staying.list) {
    const parent = parentOf.get(id);
    const list = expected.get(parent);
    if (list === undefined) {
      expected.set(parent, [id]);
    } else {
      list.push(id);
    }
  }
  const conflicts = new Set<string>();
  const childrenOf = new Map<string | undefined, string[]>();
  for (const [parent, ids] of expected) {
    const merged = mergeChildOrder(sides, staying, parentOf, parent, ids);
    childrenOf.set(parent, merged.order);
    for (const id of merged.conflicts) {
      conflicts.add(id);
    }
  }
  return { childrenOf, conflicts };
}

/**
 * The order of the children of one parent: a three-way merge of the lists of
 * child IDs (`diff3`).
 *
 * - A block that one side moved goes to the place of that side.
 * - If the two sides moved a block to different places in this list, the
 *   place of `theirs` wins, and that is a conflict.
 * - If both sides add blocks at one position, both stay: the blocks of the
 *   client come first, as the client wrote them after the block before.
 */
function mergeChildOrder(
  sides: Sides,
  staying: Staying,
  parentOf: ReadonlyMap<string, string | undefined>,
  parent: string | undefined,
  /** The children of the parent in the result. */
  expected: readonly string[],
): { order: string[]; conflicts: string[] } {
  /**
   * The child IDs of `parent` in one side, as the result has them: a child
   * that goes is replaced by its children in that side, and only the blocks
   * whose parent in the result is `parent` count.
   */
  function sideChildren(side: BlockTree): string[] {
    const result = new Set<string>();
    const visit = (ids: readonly string[]) => {
      for (const id of ids) {
        if (!staying.has(id)) {
          visit(side.childrenOf(id));
        } else if (parentOf.get(id) === parent) {
          result.add(id);
        }
      }
    };
    visit(side.childrenOf(parent));
    return [...result];
  }

  const o = sideChildren(sides.base);
  // A side that moved a block of this list to a parent that lost (see
  // `mergeParents`, for example in a cycle) does not remove the block here.
  // Thus, the block stays at its base place in that side.
  const [a, b] = [sides.ours, sides.theirs].map((side) =>
    withBasePlaces(sideChildren(side), o, expected),
  );
  // One object for each ID in each side: the merge result then tells the
  // side of each unit.
  const [baseUnits, ourUnits, theirUnits] = [o, a, b].map((ids) =>
    ids.map((id) => ({ id })),
  );
  const same = (x: { id: string }, y: { id: string }) => x.id === y.id;
  const oursToBase = myersMatch(baseUnits, ourUnits, same);
  const theirsToBase = myersMatch(baseUnits, theirUnits, same);
  const merged = diff3(
    baseUnits,
    ourUnits,
    theirUnits,
    oursToBase,
    theirsToBase,
    {
      stable: ({ theirs: unit }) => unit,
      ours: (units) => units,
      keepBothInserts: "ours-first",
      // A block of theirs in this list stays (each unit of the lists stays,
      // see `sideChildren`), also next to a change of the client.
      keepTheirs: () => true,
    },
  );
  const { order, conflicts } = resolveTwoPlaces(merged, {
    ours: ourUnits,
    theirs: theirUnits,
    oursToBase,
    theirsToBase,
  });
  // Each block of the parent is in the list of ours or of theirs, and the
  // merge keeps each unit of theirs and each unit that no side removed.
  // Thus, a missing block is a bug.
  const has = new Set(order);
  const lost = expected.find((id) => !has.has(id));
  if (lost !== undefined) {
    throw new Error(`The tree merge lost block ${lost}`);
  }
  return { order, conflicts };
}

/**
 * The order of the merged units of one list, with each block one time. A
 * unit without a base unit is a block that its side moved (or added). If
 * both sides moved a block to different places in this list, it is there
 * two times. The place of the side that moved it wins. If the two sides
 * moved it, that is a conflict: the place of theirs wins.
 */
function resolveTwoPlaces(
  merged: readonly { id: string }[],
  sides: {
    ours: readonly { id: string }[];
    theirs: readonly { id: string }[];
    oursToBase: readonly MatchedPair[];
    theirsToBase: readonly MatchedPair[];
  },
): { order: string[]; conflicts: string[] } {
  const fromOurs = new Set(sides.ours);
  const movedUnits = new Set([...sides.ours, ...sides.theirs]);
  for (const pair of sides.oursToBase) {
    movedUnits.delete(sides.ours[pair.bIndex]);
  }
  for (const pair of sides.theirsToBase) {
    movedUnits.delete(sides.theirs[pair.bIndex]);
  }
  const places = new Map<string, { id: string }[]>();
  for (const unit of merged) {
    places.set(unit.id, [...(places.get(unit.id) ?? []), unit]);
  }
  const conflicts: string[] = [];
  const order = merged.flatMap((unit) => {
    const all = places.get(unit.id) ?? [];
    if (all.length === 1) {
      return [unit.id];
    }
    const oursPlace = all.find((place) => fromOurs.has(place));
    const theirsPlace = all.find((place) => !fromOurs.has(place));
    const oursMoved = oursPlace !== undefined && movedUnits.has(oursPlace);
    const theirsMoved =
      theirsPlace !== undefined && movedUnits.has(theirsPlace);
    if (oursMoved && theirsMoved) {
      conflicts.push(unit.id);
    }
    const winner = oursMoved && !theirsMoved ? oursPlace : theirsPlace;
    return unit === winner ? [unit.id] : [];
  });
  return { order, conflicts };
}

/** Decision 4: the merged fields of a block, and whether the two sides changed the same part. */
function mergeFields(
  sides: Sides,
  id: string,
  contentKindOf: (type: string) => ContentKind,
): { block: LensBlock; conflict: boolean } {
  const { base, ours, theirs } = sides;
  if (!(base.has(id) && ours.has(id) && theirs.has(id))) {
    return {
      block: withoutChildren((ours.has(id) ? ours : theirs).block(id)),
      conflict: false,
    };
  }
  let conflict = false;
  const merged = mergeBlock(
    base.block(id),
    ours.block(id),
    theirs.block(id),
    contentKindOf,
    {
      concurrent: true,
      onConflict: () => {
        conflict = true;
      },
    },
  );
  return { block: { id, ...merged, children: [] }, conflict };
}

/** The warnings for removed blocks, in the order of `base`. */
function removalWarnings(sides: Sides): MergeWarning[] {
  const { base, ours, theirs } = sides;
  const warnings: MergeWarning[] = [];
  for (const id of base.ids) {
    if (ours.has(id) && !theirs.has(id) && sides.changedByClient(id)) {
      warnings.push({ type: "change-to-removed-block", id });
    }
    const parent = theirs.parent(id);
    if (
      !ours.has(id) &&
      theirs.has(id) &&
      (parent === undefined || ours.has(parent)) &&
      sides.changedByOthers(id)
    ) {
      warnings.push({ type: "removed-changed-block", id });
    }
  }
  return warnings;
}

/**
 * Returns `list` with each block of `baseList` that `expected` has and
 * `list` does not have, at its base place: after the nearest earlier block
 * of `baseList` that the list has.
 */
function withBasePlaces(
  list: readonly string[],
  baseList: readonly string[],
  expected: readonly string[],
): string[] {
  const has = new Set(list);
  const keep = new Set(expected);
  const result = [...list];
  baseList.forEach((id, i) => {
    if (has.has(id) || !keep.has(id)) {
      return;
    }
    let before = i - 1;
    while (before >= 0 && !has.has(baseList[before])) {
      before--;
    }
    result.splice(before < 0 ? 0 : result.indexOf(baseList[before]) + 1, 0, id);
    has.add(id);
  });
  return result;
}
