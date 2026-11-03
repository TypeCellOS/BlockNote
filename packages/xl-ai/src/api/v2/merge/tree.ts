import { withoutChildren } from "../blocks/flatten.js";
import { deepEqual } from "../blocks/json.js";
import { BlockTree } from "../blocks/tree.js";
import type { ContentKind, LensBlock } from "../blocks/types.js";
import { diffBlock } from "../blocks/update.js";
import { myersMatch } from "../diff/myers.js";
import { mergeBlock } from "./block.js";
import { diff3 } from "./diff3.js";

export type RebaseWarning =
  /** The client changed or moved a block that another writer removed. The change does not apply. */
  | { type: "change-to-removed-block"; id: string }
  /** The client removed a block that another writer changed. The block is removed, with the changes of the other writer. */
  | { type: "removed-changed-block"; id: string }
  /**
   * The client and another writer changed the same part of a block (a part
   * of its text, a style, or a prop) in different ways. The change of the
   * client applies there, and the change of the other writer there is
   * lost. An example is a block that another writer rewrote, or split into
   * two blocks.
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
 * - The parent of a block: the parent of `ours` if the client changed it,
 *   else the parent of `theirs` (see `mergeValue`). If that parent goes, the
 *   block goes to the place of that parent. If the parents of the two sides
 *   make a cycle (each side moved a block into the other), the parents of
 *   `ours` win.
 * - The order of the children of each parent: a three-way merge of the
 *   lists of child IDs (`diff3`). If both sides add blocks at one position,
 *   both stay.
 * - The fields of a block: a three-way merge (see `mergeBlock`). If both
 *   sides changed the same part, `ours` wins, with a warning.
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

  /** The parents of `ours` that win over `theirs`, to break a cycle. */
  const oursWins = new Set<string>();
  /** The parent that the merge gives the block, before a parent that goes is replaced. */
  function chosenParent(id: string): string | undefined {
    const inBase = base.has(id);
    const inOurs = ours.has(id);
    const inTheirs = theirs.has(id);
    if (inOurs && (!inBase || !inTheirs || oursWins.has(id))) {
      return ours.parent(id);
    }
    if (!inOurs) {
      return (inTheirs ? theirs : base).parent(id);
    }
    const parentInOurs = ours.parent(id);
    return parentInOurs !== base.parent(id) ? parentInOurs : theirs.parent(id);
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
   * Gives the parent of `ours` to each block on a cycle of parents. A cycle
   * needs a parent of `theirs` that is not the parent of `ours` (each side
   * alone is a tree). Thus, each round removes the cycles that it finds. Each
   * round walks up from each block one time: a block that a walk passed is
   * not walked again.
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
          if (ours.has(block) && !oursWins.has(block)) {
            oursWins.add(block);
            changed = true;
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
    const lists = [base, ours, theirs].map((side) =>
      sideChildren(side, parent),
    );
    const [o, a, b] = lists;
    const same = (x: string, y: string) => x === y;
    const merged = diff3(
      o,
      a,
      b,
      myersMatch(o, a, same),
      myersMatch(o, b, same),
      {
        stable: ({ theirs: id }) => id,
        ours: (ids) => ids,
        // Two writers add blocks at one position: the blocks of the client
        // come first, as the client wrote them after the block before.
        keepBothInserts: "ours-first",
        // A block of theirs in this list stays (each unit of the lists stays,
        // see `sideChildren`), also next to a change of the client.
        keepTheirs: () => true,
      },
    );
    const order = new Set(merged);
    // Each block of the parent is in one of the lists. This is a guard.
    for (const id of expected) {
      order.add(id);
    }
    return [...order];
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
      if (fields.conflict) {
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
      ours.parent(id) !== base.parent(id) ||
      previousKept(ours, id) !== previousKept(base, id)
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
