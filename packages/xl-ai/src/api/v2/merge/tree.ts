import { withoutChildren } from "../blocks/flatten.js";
import { deepEqual } from "../blocks/json.js";
import { BlockTree } from "../blocks/tree.js";
import type { ContentKind, LensBlock } from "../blocks/types.js";
import { diffBlock } from "../blocks/update.js";
import { myersMatch } from "../diff/myers.js";
import { mergeBlock } from "./block.js";
import { diff3 } from "./diff3.js";
import { mergeValue } from "./threeWay.js";

export type RebaseWarning =
  /** The client changed or moved a block that another writer removed. The change does not apply. */
  | { type: "change-to-removed-block"; id: string }
  /** The client removed a block that another writer changed. The block is removed, with the changes of the other writer. */
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
 * writers. The result keeps the changes of the two sides:
 *
 * - Which blocks stay: a block of `ours` stays, unless another writer
 *   removed it. A new block of another writer stays if its parent stays. A
 *   block that the client removed goes.
 * - The parent of a block: a three-way merge (see `mergeValue`). If that
 *   parent goes, the block goes to the place of that parent. If the parents
 *   of the two sides make a cycle (each side moved a block into the other),
 *   the parents of `theirs` win.
 * - The order of the children of each parent: a three-way merge of the
 *   lists of child IDs (`diff3`). A block that one side moved goes to the
 *   place of that side. If both sides add blocks at one position, both
 *   stay.
 * - The fields of a block: a three-way merge (see `mergeBlock`).
 *
 * If both sides changed the same part in different ways (a conflict), the
 * part of `theirs` wins, and the block gets the warning `conflicting-change`
 * (see `MergeOptions`).
 *
 * The merge does not know the schema. The fit of the result moves a block
 * that its parent cannot hold (see `fitLayout`).
 */
export function mergeTree(input: {
  base: readonly LensBlock[];
  ours: readonly LensBlock[];
  theirs: readonly LensBlock[];
  contentKindOf: (type: string) => ContentKind;
}): { blocks: LensBlock[]; warnings: RebaseWarning[] } {
  const base = new BlockTree(input.base);
  const ours = new BlockTree(input.ours);
  const theirs = new BlockTree(input.theirs);
  const warnings: RebaseWarning[] = [];

  /** The merged fields of a block, and whether the two sides changed the same part. */
  function fieldsOf(id: string): { block: LensBlock; conflict: boolean } {
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
      input.contentKindOf,
      {
        concurrent: true,
        onConflict: () => {
          conflict = true;
        },
      },
    );
    return { block: { id, ...merged, children: [] }, conflict };
  }

  const staysMemo = new Map<string, boolean>();
  function stays(id: string): boolean {
    let result = staysMemo.get(id);
    if (result === undefined) {
      if (ours.has(id)) {
        // Another writer removed a block of `base` that the client keeps.
        result = !base.has(id) || theirs.has(id);
      } else if (base.has(id) || !theirs.has(id)) {
        result = false;
      } else {
        // A new block of another writer stays in its parent.
        const parent = theirs.parent(id);
        result = parent === undefined || stays(parent);
      }
      staysMemo.set(id, result);
    }
    return result;
  }

  /** The blocks with a conflict of the parent or of the place: a change of the client there does not apply. */
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
    while (parent !== undefined && !stays(parent)) {
      parent = chosenParent(parent);
    }
    return parent;
  }

  const staying = [...new Set([...theirs.ids, ...ours.ids])].filter(stays);
  breakCycles();

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
      staying.forEach((id, walk) => {
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
              movedByClient(block) &&
              ours.parent(block) !== theirs.parent(block)
            ) {
              conflicts.add(block);
            }
          }
        }
      });
    }
  }

  /**
   * The child IDs of `parent` in one side, as the result has them: a child
   * that goes is replaced by its children in that side, and only the blocks
   * whose parent in the result is `parent` count.
   */
  function sideChildren(side: BlockTree, parent: string | undefined): string[] {
    const result = new Set<string>();
    const visit = (ids: readonly string[]) => {
      for (const id of ids) {
        if (!stays(id)) {
          visit(side.childrenOf(id));
        } else if (parentOf(id) === parent) {
          result.add(id);
        }
      }
    };
    visit(side.childrenOf(parent));
    return [...result];
  }

  const childrenByParent = new Map<string | undefined, string[]>();
  for (const id of staying) {
    const parent = parentOf(id);
    const list = childrenByParent.get(parent) ?? [];
    list.push(id);
    childrenByParent.set(parent, list);
  }

  function childOrder(parent: string | undefined): string[] {
    const expected = childrenByParent.get(parent) ?? [];
    if (expected.length === 0) {
      return [];
    }
    const o = sideChildren(base, parent);
    // A side that moved a block of this list to a parent that lost (see
    // `parentOf`, for example in a cycle) does not remove the block here.
    // Thus, the block stays at its base place in that side.
    const [a, b] = [ours, theirs].map((side) =>
      withBasePlaces(sideChildren(side, parent), o, expected),
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
        // Two writers add blocks at one position: the blocks of the client
        // come first, as the client wrote them after the block before.
        keepBothInserts: "ours-first",
        // A block of theirs in this list stays (each unit of the lists stays,
        // see `sideChildren`), also next to a change of the client.
        keepTheirs: () => true,
      },
    );
    // A unit without a base unit is a block that its side moved (or added).
    // If both sides moved a block to different places in this list, it is
    // there two times. The place of the side that moved it wins. If the two
    // sides moved it, that is a conflict: the place of theirs wins.
    const fromOurs = new Set(ourUnits);
    const movedUnits = new Set([...ourUnits, ...theirUnits]);
    for (const pair of oursToBase) {
      movedUnits.delete(ourUnits[pair.bIndex]);
    }
    for (const pair of theirsToBase) {
      movedUnits.delete(theirUnits[pair.bIndex]);
    }
    const places = new Map<string, { id: string }[]>();
    for (const unit of merged) {
      places.set(unit.id, [...(places.get(unit.id) ?? []), unit]);
    }
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
        conflicts.add(unit.id);
      }
      const winner = oursMoved && !theirsMoved ? oursPlace : theirsPlace;
      return unit === winner ? [unit.id] : [];
    });
    // Each block of the parent is in the list of ours or of theirs, and the
    // merge keeps each unit of theirs and each unit that no side removed.
    // Thus, a missing block is a bug.
    const has = new Set(order);
    const lost = expected.find((id) => !has.has(id));
    if (lost !== undefined) {
      throw new Error(`The tree merge lost block ${lost}`);
    }
    return order;
  }

  /**
   * The blocks of the parent in the result. The result does not know the
   * schema: for example, a new paragraph of the client in a column that
   * another writer removed is in the column list. The fit of the result (see
   * `fitLayout`) moves it.
   */
  function build(parent: string | undefined): LensBlock[] {
    return childOrder(parent).map((id) => {
      const fields = fieldsOf(id);
      if (fields.conflict || conflicts.has(id)) {
        warnings.push({ type: "conflicting-change", id });
      }
      return { ...fields.block, children: build(id) };
    });
  }
  const blocks = build(undefined);

  // The warnings for removed blocks.
  for (const id of base.ids) {
    if (ours.has(id) && !theirs.has(id) && changedByClient(id)) {
      warnings.push({ type: "change-to-removed-block", id });
    }
    const parent = theirs.parent(id);
    if (
      !ours.has(id) &&
      theirs.has(id) &&
      (parent === undefined || ours.has(parent)) &&
      changedByOthers(id)
    ) {
      warnings.push({ type: "removed-changed-block", id });
    }
  }

  /** Returns true if the client changed the fields, the parent or the place of the block. */
  function changedByClient(id: string): boolean {
    return (
      diffBlock(base.block(id), ours.block(id)) !== undefined ||
      movedByClient(id)
    );
  }

  /** Returns true if the client changed the parent or the place of a block of base. */
  function movedByClient(id: string): boolean {
    return (
      base.has(id) &&
      ours.has(id) &&
      (ours.parent(id) !== base.parent(id) ||
        previousKept(ours, id) !== previousKept(base, id))
    );
  }

  /**
   * The previous sibling of the block in the side, of the blocks that base
   * and `ours` both have. Thus, a new block or a removed block next to the
   * block is not a move of it.
   */
  function previousKept(side: BlockTree, id: string): string | undefined {
    const siblings = side.childrenOf(side.parent(id));
    for (let i = side.index(id) - 1; i >= 0; i--) {
      if (base.has(siblings[i]) && ours.has(siblings[i])) {
        return siblings[i];
      }
    }
    return undefined;
  }

  /** Returns true if another writer changed the block or a block in it. */
  function changedByOthers(id: string): boolean {
    return (
      !base.has(id) ||
      !deepEqual(
        withoutChildren(theirs.block(id)),
        withoutChildren(base.block(id)),
      ) ||
      theirs.childrenOf(id).some(changedByOthers)
    );
  }

  return { blocks, warnings };
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
