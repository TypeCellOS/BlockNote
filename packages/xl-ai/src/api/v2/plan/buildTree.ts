import type { BlockTree } from "../blocks/tree.js";
import type { BlockFields, FlatBlock, LensBlock } from "../blocks/types.js";

/** A row of the correspondence (see `TextRow`), with the fields of its block. */
export type TreeRow =
  /** A source block that stays, with its merged fields. */
  | {
      kind: "kept";
      id: string;
      viewIndex: number;
      moved: boolean;
      fields: BlockFields;
    }
  /** A new block, with the fields of the text block. */
  | {
      kind: "new";
      viewIndex: number | undefined;
      id: string | undefined;
      fields: BlockFields;
    }
  | { kind: "skipped"; viewIndex: number | undefined };

type KeptRow = Extract<TreeRow, { kind: "kept" }>;

/**
 * Builds the target tree: the blocks of the rows in the order of the text,
 * in the parent that the text shows. Then the hidden blocks that stay go to
 * their source positions.
 *
 * There is one exception to the parent of the text: a kept block keeps a
 * nesting that the format does not show (for example a paragraph in a
 * bullet, in markdown), if the text did not change its nesting and the
 * parent is still open. A new block before such a block goes into the same
 * nesting (see {@link keptParent}).
 */
export function buildTree(input: {
  rows: readonly TreeRow[];
  /** The blocks of the text, in a flat list (for their parents and types). */
  incoming: readonly FlatBlock[];
  /** The view blocks (for their parents and types). */
  view: readonly FlatBlock[];
  source: BlockTree;
  invisibleIds: ReadonlySet<string>;
  /** The source blocks that stay (see `Correspondence.kept`). */
  kept: ReadonlySet<string>;
  /** Gives the ID of a new block. */
  newId: () => string;
}): LensBlock[] {
  const { rows, incoming, view, source, invisibleIds, kept } = input;

  // The tree is built in the order of the text. The stack holds the open
  // ancestors: the last block at each depth. A block goes into an open
  // ancestor, and closes the blocks below it.
  const root = node("", { type: "", props: {}, content: undefined });
  const stack: LensBlock[] = [root];
  /** The target node of each source block that is in the tree. */
  const nodeOf = new Map<string, LensBlock>();
  /** The target node of each text block that is in the tree. */
  const nodes: (LensBlock | undefined)[] = new Array(rows.length);

  function attach(block: LensBlock, parent: LensBlock) {
    const depth = stack.indexOf(parent);
    if (depth === -1) {
      throw new Error(`Block ${parent.id} is not an open ancestor`);
    }
    stack.length = depth + 1;
    parent.children.push(block);
    stack.push(block);
  }

  /** The target node of the nearest text ancestor of text block `j` that has a node, or the root. */
  function textParent(j: number): LensBlock {
    for (
      let p = incoming[j].parentIndex;
      p !== undefined;
      p = incoming[p].parentIndex
    ) {
      const parent = nodes[p];
      if (parent !== undefined) {
        return parent;
      }
    }
    return root;
  }

  /**
   * Returns true if the text shows kept text block `j` with the nesting
   * of its view block: the same parent, with the same type. A format can
   * show the children of different types in different ways (for example
   * HTML, the children of a toggle and of a bullet). Thus, after a change of
   * the parent type, a nesting that the view did not show can show.
   */
  function nestingUnchanged(j: number, row: KeptRow): boolean {
    const textParentIndex = incoming[j].parentIndex;
    const viewParentIndex = view[row.viewIndex].parentIndex;
    return textParentIndex === undefined
      ? viewParentIndex === undefined
      : rows[textParentIndex].viewIndex === viewParentIndex &&
          viewParentIndex !== undefined &&
          view[viewParentIndex].block.type ===
            incoming[textParentIndex].block.type;
  }

  /**
   * Returns the target node of the source parent of kept block `id`, if the
   * block can stay in it: the parent and the ancestors stay, the parent is an
   * open ancestor, and the parent keeps its type. Hidden ancestors without a
   * node get one here. If not, returns `undefined`.
   */
  function sourceParent(id: string): LensBlock | undefined {
    const hidden = hiddenAncestors(id);
    const visible = source.parent(hidden.at(-1) ?? id);
    let parent = visible === undefined ? root : nodeOf.get(visible);
    if (
      parent === undefined ||
      !stack.includes(parent) ||
      hidden.some((ancestor) => !kept.has(ancestor)) ||
      // The format did not show the nesting under the type of the source
      // parent. Under a new type (for example a bullet instead of a
      // paragraph), the format can show it, thus the text decides.
      (visible !== undefined && parent.type !== source.block(visible).type)
    ) {
      return undefined;
    }
    for (const ancestor of hidden.reverse()) {
      let block = nodeOf.get(ancestor);
      if (block === undefined) {
        block = node(ancestor, source.block(ancestor));
        attach(block, parent);
        nodeOf.set(ancestor, block);
      } else if (!stack.includes(block)) {
        return undefined;
      }
      parent = block;
    }
    return parent;
  }

  /**
   * Returns the source parent of the next kept block after new block `j`, if
   * that block has the same text parent and keeps a nesting that the text
   * does not show. The new block then goes into the same nesting, before it.
   */
  function nestingOfNext(j: number): LensBlock | undefined {
    const next = nextKept(j);
    return next !== undefined ? sourceParent(next.row.id) : undefined;
  }

  /** The index of the first kept row at or after each index, from the end. */
  const keptFrom: (number | undefined)[] = new Array(rows.length + 1);
  for (let k = rows.length - 1; k >= 0; k--) {
    keptFrom[k] = rows[k].kind === "kept" ? k : keptFrom[k + 1];
  }

  /**
   * The next kept block after block `j`, if it has the same text parent and
   * keeps the nesting of its view block. Else `undefined`.
   */
  function nextKept(j: number): { index: number; row: KeptRow } | undefined {
    const index = keptFrom[j + 1];
    if (index === undefined) {
      return undefined;
    }
    const row = rows[index] as KeptRow;
    return incoming[index].parentIndex === incoming[j].parentIndex &&
      nestingUnchanged(index, row)
      ? { index, row }
      : undefined;
  }

  /**
   * The parent of kept block `j` in the target:
   *
   * - If the text changed the nesting of the block, the parent of the text.
   * - Else, the source parent, with the nesting that the format does not
   *   show (for example a column). There are two exceptions. A block that
   *   the text moved to a place outside its hidden blocks (none of them is
   *   open, and the next kept block is not in one of them) does not keep
   *   that nesting. A block between two blocks of an open hidden block (for
   *   example the blocks of two columns) does not close it.
   * - In these cases, and if the source parent is not open any more, the
   *   block goes where a new block goes: into the nesting of the next kept
   *   block, or else into the parent of the text.
   */
  function keptParent(j: number, row: KeptRow): LensBlock {
    if (!nestingUnchanged(j, row)) {
      return textParent(j);
    }
    const asNew = () => nestingOfNext(j) ?? textParent(j);
    if (row.moved && !isNearHiddenAncestor(j, row.id)) {
      return asNew();
    }
    const parent = sourceParent(row.id);
    if (parent === undefined) {
      return asNew();
    }
    return nextNeedsOpenHiddenBlock(j, parent)
      ? (nestingOfNext(j) ?? parent)
      : parent;
  }

  /** The hidden ancestors of a source block: the ancestors up to the first visible one. */
  function hiddenAncestors(id: string): string[] {
    const ancestors: string[] = [];
    for (
      let ancestor = source.parent(id);
      ancestor !== undefined && invisibleIds.has(ancestor);
      ancestor = source.parent(ancestor)
    ) {
      ancestors.push(ancestor);
    }
    return ancestors;
  }

  /**
   * Returns true if a hidden ancestor of kept block `j` is at its new place:
   * the ancestor is open, or the next kept block is also in it.
   */
  function isNearHiddenAncestor(j: number, id: string): boolean {
    const own = hiddenAncestors(id);
    if (own.some((ancestor) => isOpen(ancestor))) {
      return true;
    }
    const next = nextKept(j);
    const ofNext = new Set(
      next === undefined ? [] : hiddenAncestors(next.row.id),
    );
    return own.some((ancestor) => ofNext.has(ancestor));
  }

  function isOpen(id: string): boolean {
    const block = nodeOf.get(id);
    return block !== undefined && stack.includes(block);
  }

  /**
   * Returns true if the next kept block after block `j` needs a hidden block
   * that is open below `parent`. If block `j` went into `parent`, it would
   * close that hidden block, and the next block cannot go back into it.
   * An example is a top-level block that the text puts between the blocks
   * of two columns. This does not change the tree.
   */
  function nextNeedsOpenHiddenBlock(j: number, parent: LensBlock): boolean {
    const next = nextKept(j);
    const depth = stack.indexOf(parent);
    return (
      next !== undefined &&
      hiddenAncestors(next.row.id).some((ancestor) => {
        const block = nodeOf.get(ancestor);
        return block !== undefined && stack.indexOf(block) > depth;
      })
    );
  }

  rows.forEach((row, j) => {
    switch (row.kind) {
      case "skipped":
        return;
      case "new": {
        const block = node(row.id ?? input.newId(), row.fields);
        attach(block, nestingOfNext(j) ?? textParent(j));
        nodes[j] = block;
        return;
      }
      case "kept": {
        const block = node(row.id, row.fields);
        attach(block, keptParent(j, row));
        nodeOf.set(row.id, block);
        nodes[j] = block;
        return;
      }
    }
  });

  placeHiddenBlocks(root, nodeOf, source, invisibleIds, kept);
  return root.children;
}

/**
 * The hidden blocks that stay and are not in the tree yet go to their source
 * positions: in their parent, after the last earlier sibling that is there.
 * In document order, thus a parent is in the tree before its children.
 */
function placeHiddenBlocks(
  root: LensBlock,
  nodeOf: Map<string, LensBlock>,
  source: BlockTree,
  invisibleIds: ReadonlySet<string>,
  kept: ReadonlySet<string>,
) {
  function place(parentId: string | undefined) {
    const parent = parentId === undefined ? root : nodeOf.get(parentId);
    const siblings = source.childrenOf(parentId);
    if (parent !== undefined) {
      const present = new Set(parent.children.map((child) => child.id));
      // The hidden blocks after each present block (first for
      // `undefined`), in source order.
      const after = new Map<string | undefined, LensBlock[]>();
      let last: string | undefined;
      for (const id of siblings) {
        if (invisibleIds.has(id) && kept.has(id) && !nodeOf.has(id)) {
          const block = node(id, source.block(id));
          nodeOf.set(id, block);
          const list = after.get(last) ?? [];
          list.push(block);
          after.set(last, list);
        } else if (present.has(id)) {
          last = id;
        }
      }
      if (after.size > 0) {
        parent.children = withInserts(parent.children, after);
      }
    }
    for (const id of siblings) {
      place(id);
    }
  }
  place(undefined);
}

/** Returns `children` with the blocks of `after` after the block with each ID (first for `undefined`). */
function withInserts(
  children: readonly LensBlock[],
  after: ReadonlyMap<string | undefined, readonly LensBlock[]>,
): LensBlock[] {
  const result: LensBlock[] = [];
  function insertAfter(id: string | undefined) {
    for (const block of after.get(id) ?? []) {
      result.push(block);
    }
  }
  insertAfter(undefined);
  for (const child of children) {
    result.push(child);
    insertAfter(child.id);
  }
  return result;
}

function node(id: string, fields: BlockFields): LensBlock {
  const { type, props, content } = fields;
  return { id, type, props, content, children: [] };
}
