import type { ContentKind, LensBlock } from "../model.js";
import {
  BlockIndex,
  diffBlock,
  type Parent,
  TOP_LEVEL,
  withoutChildren,
} from "../util/blocks/index.js";
import { myersMatch } from "../util/sequence/index.js";
import { mergeBlock } from "./block.js";
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
 * Three-way merge of documents, by block ID. `base` is the document that
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
 * (see the rules in `mergeFields`).
 *
 * The merge does not know the schema. The fit of the result moves a block
 * that its parent cannot hold (see `fitLayout`). For example, a new
 * paragraph of the client in a column that another writer removed is in the
 * column list.
 *
 * Method: our own design. Step 3 applies the moves and the new blocks of the
 * client to the order of `theirs`, and step 4 uses the three-way rule.
 */
export function mergeDocument(input: {
  base: readonly LensBlock[];
  ours: readonly LensBlock[];
  theirs: readonly LensBlock[];
  contentKindOf: (type: string) => ContentKind;
}): { blocks: LensBlock[]; warnings: MergeWarning[] } {
  const sides = new Sides(
    new BlockIndex(input.base),
    new BlockIndex(input.ours),
    new BlockIndex(input.theirs),
  );
  const staying = stayingBlocks(sides);
  const parents = mergeParents(sides, staying);
  const children = mergeChildOrders(sides, staying, parents.parentOf);
  const conflicts = new Set([...parents.conflicts, ...children.conflicts]);

  const warnings: MergeWarning[] = [];
  function build(parent: Parent): LensBlock[] {
    return (children.childrenOf.get(parent) ?? []).map((id) => {
      const fields = mergeFields(sides, id, input.contentKindOf);
      if (fields.conflict || conflicts.has(id)) {
        warnings.push({ type: "conflicting-change", id });
      }
      return { ...fields.block, children: build(id) };
    });
  }
  const blocks = build(TOP_LEVEL);
  return { blocks, warnings: [...warnings, ...removalWarnings(sides)] };
}

/** The three sides of the merge, and the questions that the decisions ask about them. */
class Sides {
  private readonly removalLosesChangeMemo = new Map<string, boolean>();

  constructor(
    readonly base: BlockIndex,
    readonly ours: BlockIndex,
    readonly theirs: BlockIndex,
  ) {}

  /**
   * Returns true if the removal of the block by the client loses a change of
   * another writer: a change of its fields, a new block, or such a change in
   * a block in it that the client also removes. A block in it that the
   * client keeps (for example, moves out) does not count: its change stays.
   *
   * Example: a block S with the children A and B. The client removes S and
   * B, and moves A out. Another writer changes A. The removal of S loses no
   * change, thus S goes. Without the check of `ours`, S stays empty, with
   * the warning `removed-changed-block`.
   */
  removalLosesChange(id: string): boolean {
    let result = this.removalLosesChangeMemo.get(id);
    if (result === undefined) {
      result =
        !this.base.has(id) ||
        this.fieldsChanged(this.theirs, id) ||
        // Or the removal loses such a change deeper down: in a child (in
        // `theirs`) that the client also removes. A child that the client
        // keeps (for example, moves out) stays, with the blocks in it.
        this.theirs
          .childrenOf(id)
          .some(
            (child) => !this.ours.has(child) && this.removalLosesChange(child),
          );
      this.removalLosesChangeMemo.set(id, result);
    }
    return result;
  }

  /** Returns true if the client changed the fields, the parent or the place of the block. */
  changedByClient(id: string): boolean {
    return this.fieldsChanged(this.ours, id) || this.movedByClient(id);
  }

  /** Returns true if `side` changed the type, the props or the content of a block of base. */
  private fieldsChanged(side: BlockIndex, id: string): boolean {
    return diffBlock(this.base.block(id), side.block(id)) !== undefined;
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
  private previousKept(side: BlockIndex, id: string): string | undefined {
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
 * - A block that the client removed goes, unless its removal loses a change
 *   of another writer (see `Sides.removalLosesChange`): then it stays. A
 *   write from an older version does not remove a change that it did not
 *   see. The other blocks in it that the client removed go.
 */
function stayingBlocks(sides: Sides): Staying {
  const { base, ours, theirs } = sides;
  const memo = new Map<string, boolean>();
  function stays(id: string): boolean {
    let result = memo.get(id);
    if (result === undefined) {
      if (ours.has(id)) {
        // The client has the block: a block of base, or a new block of the
        // client. It goes only if another writer removed it.
        const removedByOthers = base.has(id) && !theirs.has(id);
        result = !removedByOthers;
      } else if (!theirs.has(id)) {
        // The client and another writer both removed it.
        result = false;
      } else if (base.has(id)) {
        // The client removed it, and another writer did not.
        result = sides.removalLosesChange(id);
      } else {
        // A new block of another writer.
        const parent = theirs.parent(id);
        result = parent === TOP_LEVEL || stays(parent);
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
  parentOf: Map<string, Parent>;
  /** The blocks with a conflict of the parent: a change of the client there does not apply. */
  conflicts: Set<string>;
} {
  const { base, ours, theirs } = sides;
  const conflicts = new Set<string>();

  /**
   * The parent that the merge gives the block, before a parent that goes is
   * replaced. A block in `theirsWins` gets its parent of `theirs` (see
   * `breakCycles`).
   */
  function chosenParent(id: string, theirsWins: ReadonlySet<string>): Parent {
    if (!theirs.has(id)) {
      return (ours.has(id) ? ours : base).parent(id);
    }
    if (!ours.has(id) || !base.has(id) || theirsWins.has(id)) {
      return theirs.parent(id);
    }
    return mergeValue(base.parent(id), ours.parent(id), theirs.parent(id), {
      winner: "theirs",
      onConflict: () => conflicts.add(id),
    });
  }

  /** The parent in the result: the chosen parent, or the place of a chosen parent that goes. */
  function parentOf(id: string, theirsWins: ReadonlySet<string>): Parent {
    let parent = chosenParent(id, theirsWins);
    while (parent !== TOP_LEVEL && !staying.has(parent)) {
      parent = chosenParent(parent, theirsWins);
    }
    return parent;
  }

  /**
   * Returns the blocks that get their parent of `theirs`, so that the
   * parents have no cycle: each block of `theirs` on a cycle. A cycle needs a
   * parent of `ours` that is not the parent of `theirs` (each side alone is a
   * tree). Thus, each round removes the cycles that it finds. Each round
   * walks up from each block one time: a block that a walk passed is not
   * walked again. A block that the client moved to another parent there also
   * gets a conflict (for the warning).
   *
   * Example: the client moves A into B, and another writer moves B into A.
   * The merged parents make the cycle A → B → A. A and B get their parents
   * of `theirs`, thus the result is A with B in it. Without this, no path
   * goes from the top level to A and B, and the result loses both.
   */
  function breakCycles(): Set<string> {
    const theirsWins = new Set<string>();
    for (let changed = true; changed;) {
      changed = false;
      /** The walk that passed each block. */
      const walkOf = new Map<string, number>();
      staying.list.forEach((id, walk) => {
        const path: string[] = [];
        let current: Parent = id;
        while (current !== TOP_LEVEL && !walkOf.has(current)) {
          walkOf.set(current, walk);
          path.push(current);
          current = parentOf(current, theirsWins);
        }
        if (current === TOP_LEVEL || walkOf.get(current) !== walk) {
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
    return theirsWins;
  }

  const theirsWins = breakCycles();
  return {
    parentOf: new Map(staying.list.map((id) => [id, parentOf(id, theirsWins)])),
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
  parentOf: ReadonlyMap<string, Parent>,
): {
  childrenOf: Map<Parent, string[]>;
  /** The blocks that the two sides moved to different places in one list. */
  conflicts: Set<string>;
} {
  /** The children of each parent in the result, in no order yet. */
  const unordered = new Map<Parent, string[]>();
  for (const id of staying.list) {
    const parent = parentOf.get(id);
    const list = unordered.get(parent);
    if (list === undefined) {
      unordered.set(parent, [id]);
    } else {
      list.push(id);
    }
  }
  const conflicts = new Set<string>();
  const childrenOf = new Map<Parent, string[]>();
  for (const [parent, children] of unordered) {
    const merged = mergeChildOrder(sides, staying, parentOf, parent, children);
    childrenOf.set(parent, merged.order);
    for (const id of merged.conflicts) {
      conflicts.add(id);
    }
  }
  return { childrenOf, conflicts };
}

/**
 * The order of the children of one parent. The order of `theirs` (the
 * current document) stays, and the moves and the new blocks of the client
 * apply to it: each such block goes after the block before it in the list of
 * the client, or first (as in `diffDocuments`).
 *
 * - A block that one side moved goes to the place of that side.
 * - If the two sides moved a block to different places in this list, the
 *   place of `theirs` wins, and that is a conflict.
 * - If both sides add blocks at one position, both stay: the blocks of the
 *   client come first, as the client wrote them after the block before.
 *
 * Example: the base list is `[a, b, c]`. The client moved c first:
 * `[c, a, b]`. Another writer added x: `[a, x, b, c]`. The result starts
 * from `[a, x, b, c]`, and c goes first: `[c, a, x, b]`.
 */
function mergeChildOrder(
  sides: Sides,
  staying: Staying,
  parentOf: ReadonlyMap<string, Parent>,
  parent: Parent,
  /** The children of the parent in the result. */
  children: readonly string[],
): { order: string[]; conflicts: string[] } {
  /**
   * The child IDs of `parent` in one side, as the result has them: a child
   * that goes is replaced by its children in that side, and only the blocks
   * whose parent in the result is `parent` count.
   */
  function sideChildren(side: BlockIndex): string[] {
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

  const baseList = sideChildren(sides.base);
  // A side that moved a block of this list to a parent that lost (see
  // `mergeParents`, for example in a cycle) does not remove the block here.
  // Thus, the block stays at its base place in that side.
  const [ourList, theirList] = [sides.ours, sides.theirs].map((side) =>
    withBasePlaces(sideChildren(side), baseList, children),
  );
  const oursKept = keptInOrder(baseList, ourList);
  const theirsKept = keptInOrder(baseList, theirList);
  /** The block before each block in the list of `theirs` (`undefined` for the first). */
  const theirPrevious = new Map(
    theirList.map((id, index) => [id, theirList[index - 1]]),
  );

  const order = [...theirList];
  const conflicts: string[] = [];
  ourList.forEach((id, index) => {
    if (oursKept.has(id)) {
      // The client did not move the block: its place in `theirs` stays.
      return;
    }
    const previous = index > 0 ? ourList[index - 1] : undefined;
    if (theirPrevious.has(id) && !theirsKept.has(id)) {
      // Both sides moved (or added) the block: the place of `theirs` wins.
      if (theirPrevious.get(id) !== previous) {
        conflicts.push(id);
      }
      return;
    }
    // The client moved or added the block: it goes after the block before
    // it in the list of the client (that block has its place already,
    // because the loop goes in the order of the client), or first.
    const from = order.indexOf(id);
    if (from !== -1) {
      order.splice(from, 1);
    }
    const after = previous === undefined ? -1 : order.indexOf(previous);
    if (previous !== undefined && after === -1) {
      throw new Error(`The document merge lost block ${previous}`);
    }
    order.splice(after + 1, 0, id);
  });
  // Each block of the parent is in the list of ours or of theirs, and the
  // order keeps each block of theirs and adds each block of ours. Thus, a
  // missing block is a bug.
  const has = new Set(order);
  const lost = children.find((id) => !has.has(id));
  if (lost !== undefined) {
    throw new Error(`The document merge lost block ${lost}`);
  }
  return { order, conflicts };
}

/**
 * The blocks of `list` that keep their order of `baseList`: a longest
 * common subsequence of the two lists (Myers). The other blocks of `list`
 * moved or are new.
 */
function keptInOrder(
  baseList: readonly string[],
  list: readonly string[],
): Set<string> {
  return new Set(
    myersMatch(baseList, list, (x, y) => x === y).map(
      ({ bIndex }) => list[bIndex],
    ),
  );
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
      // `theirs` (the current document) wins a conflict, and the client gets
      // the warning: thus, the client loses the conflicting part, and it can
      // read the document again. A write from an older version then never
      // reverts a change that it did not see.
      conflict: {
        winner: "theirs",
        onConflict: () => {
          conflict = true;
        },
      },
      // Two writers add text (or table rows) at one position: the insert
      // that applied first (of the other writer) stays first. Thus, two
      // additions at the end read in the order of the writes.
      insertsAtOnePosition: "both-theirs-first",
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
      (parent === TOP_LEVEL || ours.has(parent)) &&
      sides.removalLosesChange(id)
    ) {
      warnings.push({ type: "removed-changed-block", id });
    }
  }
  return warnings;
}

/**
 * Returns `list` with each block of `baseList` that `children` has and
 * `list` does not have, at its base place: after the nearest earlier block
 * of `baseList` that the list has.
 */
function withBasePlaces(
  list: readonly string[],
  baseList: readonly string[],
  children: readonly string[],
): string[] {
  const has = new Set(list);
  const keep = new Set(children);
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
