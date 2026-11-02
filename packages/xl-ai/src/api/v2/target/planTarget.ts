import { blockKey } from "../blocks/json.js";
import { blockToText } from "../blocks/text.js";
import { BlockTree } from "../blocks/tree.js";
import type {
  BlockFields,
  ContentKind,
  FlatBlock,
  LensBlock,
} from "../blocks/types.js";
import type { BlockPair } from "../alignment/alignBlocks.js";
import { mergeBlock } from "../merge/block.js";
import type { Projection } from "../projection/projectDocument.js";

export type PlanWarning =
  /**
   * The text changed a block that renders as more than one view block. An
   * example is a code block with blank lines, in plain text. The incoming
   * blocks replace the block. Thus, the data that the format does not show
   * is lost.
   */
  | { type: "multi-part-block-replaced"; id: string }
  /**
   * The text changed or removed a part of the text that does not come from
   * one document block (`text` is that part, as the format shows it). The
   * planner cannot apply this change, thus it does not use it. An empty view
   * block without a document block gives no warning.
   */
  | { type: "unlinked-block-changed"; text: string }
  /**
   * The format shows the block with content of a different shape (for
   * example a table as lines of text), and the text changed that content.
   * The block takes the type of the text block. Thus, its old content and
   * the props of its old type are lost.
   */
  | { type: "block-shape-replaced"; id: string };

export type PlanInput = {
  /** The document that gets the text. */
  document: readonly LensBlock[];
  /** `document` as the format shows it. */
  projection: Projection;
  /** The blocks from the incoming text, in a flat list. */
  incoming: FlatBlock[];
  /** The matches of `projection.view` (a side) to `incoming` (b side). */
  alignment: BlockPair[];
  contentKindOf: (type: string) => ContentKind;
  /** Gives the ID of a new block. */
  newId: () => string;
};

export type Plan = { target: LensBlock[]; warnings: PlanWarning[] };

/**
 * Makes the target document: `document` as the text asks for it.
 *
 * - A source block with a match in the text stays, with the three-way merge
 *   of its fields (see `merge/block.ts`). A new block gets a new ID.
 * - The blocks are in the order of the text, in the parent that the text
 *   shows. There is one exception: a block keeps a nesting that the format
 *   does not show (for example a paragraph in a bullet, in markdown), if the
 *   text did not change its nesting and the parent is still open. A new
 *   block before such a block goes into the same nesting.
 * - Source blocks without a view block (blocks that the format does not show)
 *   stay at their positions, with their parent. If the planner removes their
 *   parent, or all the visible blocks around them, it also removes them.
 */
export function planTarget(input: PlanInput): Plan {
  const { view, invisibleIds, multiPartIds } = input.projection;
  const { incoming, contentKindOf } = input;
  const source = new BlockTree(input.document);
  const warnings: PlanWarning[] = [];

  const viewToIncoming = new Int32Array(view.length).fill(-1);
  const incomingToView = new Int32Array(incoming.length).fill(-1);
  for (const pair of input.alignment) {
    viewToIncoming[pair.aIndex] = pair.bIndex;
    incomingToView[pair.bIndex] = pair.aIndex;
  }

  // 1. Find the source blocks that stay, and the incoming block of each.
  // A multi-part block stays only if the text did not change its parts: each
  // part is in the text, unchanged, and the parts are next to each other in
  // the same order.
  const replaced = new Set<string>();
  for (const id of multiPartIds) {
    const parts = view.flatMap((viewBlock, v) =>
      viewBlock.sourceId === id ? [v] : [],
    );
    const unchanged = parts.every((v, k) => {
      const j = viewToIncoming[v];
      return (
        j !== -1 &&
        blockKey(view[v].block) === blockKey(incoming[j].block) &&
        (k === 0 || j === viewToIncoming[parts[k - 1]] + 1)
      );
    });
    if (!unchanged) {
      replaced.add(id);
      warnings.push({ type: "multi-part-block-replaced", id });
    }
  }
  const kept = new Set<string>();
  const keptIdOf: (string | undefined)[] = new Array(incoming.length);
  const skipped = new Set<number>();
  view.forEach((viewBlock, v) => {
    const j = viewToIncoming[v];
    const { sourceId } = viewBlock;
    if (sourceId === undefined) {
      const unchanged =
        j !== -1 && blockKey(viewBlock.block) === blockKey(incoming[j].block);
      if (unchanged) {
        skipped.add(j);
      } else if (!isEmptyTextBlock(viewBlock.block)) {
        warnings.push({
          type: "unlinked-block-changed",
          text: blockToText(viewBlock.block),
        });
        if (j !== -1) {
          skipped.add(j);
        }
      }
      // Else, the view block is empty, and has no source. An example is the
      // list item that the markdown parse adds around an image after a
      // nested list. The text cannot change data of it, thus there is no
      // warning, and its pair (if there is one) is a block of the text.
    } else if (j !== -1 && !replaced.has(sourceId)) {
      if (kept.has(sourceId)) {
        // Another part of a multi-part block. The first part is the block.
        skipped.add(j);
      } else {
        kept.add(sourceId);
        keptIdOf[j] = sourceId;
      }
    }
  });
  keepInvisibleBlocks(source, invisibleIds, kept);

  // 2. Build the target tree in the order of the text. The stack holds the
  // open ancestors: the last block at each depth. A block goes into an open
  // ancestor, and closes the blocks below it.
  const root = node("", { type: "", props: {}, content: undefined });
  const stack: LensBlock[] = [root];
  const nodeOf = new Map<string, LensBlock>();
  const nodes: (LensBlock | undefined)[] = new Array(incoming.length);

  function attach(block: LensBlock, parent: LensBlock) {
    const depth = stack.indexOf(parent);
    if (depth === -1) {
      throw new Error(`Block ${parent.id} is not an open ancestor`);
    }
    stack.length = depth + 1;
    parent.children.push(block);
    stack.push(block);
  }

  /** The target node of the nearest text ancestor of incoming block `j` that has a node, or the root. */
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

  /** Returns true if the text shows kept incoming block `j` with the nesting of its view block. */
  function nestingUnchanged(j: number): boolean {
    const textParentIndex = incoming[j].parentIndex;
    const viewParentIndex = view[incomingToView[j]].parentIndex;
    return textParentIndex === undefined
      ? viewParentIndex === undefined
      : incomingToView[textParentIndex] === viewParentIndex;
  }

  /**
   * Returns the target node of the source parent of kept block `id`, if the
   * block can stay in it: the parent and the ancestors stay, and the parent
   * is an open ancestor. Hidden ancestors without a node get one here. If
   * not, returns `undefined`.
   */
  function sourceParent(id: string): LensBlock | undefined {
    const hidden: string[] = [];
    let visible = source.parent(id);
    while (visible !== undefined && invisibleIds.has(visible)) {
      hidden.push(visible);
      visible = source.parent(visible);
    }
    let parent = visible === undefined ? root : nodeOf.get(visible);
    if (
      parent === undefined ||
      !stack.includes(parent) ||
      hidden.some((ancestor) => !kept.has(ancestor))
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
    let next = j + 1;
    while (
      next < incoming.length &&
      (skipped.has(next) || keptIdOf[next] === undefined)
    ) {
      next++;
    }
    const nextId = keptIdOf[next];
    return nextId !== undefined &&
      incoming[next].parentIndex === incoming[j].parentIndex &&
      nestingUnchanged(next)
      ? sourceParent(nextId)
      : undefined;
  }

  for (let j = 0; j < incoming.length; j++) {
    if (skipped.has(j)) {
      continue;
    }
    const id = keptIdOf[j];
    if (id === undefined) {
      const block = node(input.newId(), incoming[j].block);
      attach(block, nestingOfNext(j) ?? textParent(j));
      nodes[j] = block;
      continue;
    }
    const viewBlock = view[incomingToView[j]].block;
    const merged = mergeBlock(
      viewBlock,
      incoming[j].block,
      source.block(id),
      contentKindOf,
    );
    if (
      viewBlock.type === incoming[j].block.type &&
      merged.type !== source.block(id).type
    ) {
      warnings.push({ type: "block-shape-replaced", id });
    }
    const block = node(id, merged);
    const parent = nestingUnchanged(j) ? sourceParent(id) : undefined;
    attach(block, parent ?? textParent(j));
    nodeOf.set(id, block);
    nodes[j] = block;
  }

  // 3. The hidden blocks that are not in the tree yet stay at their source
  // positions: in their parent, after the last earlier sibling that is there.
  // In document order, thus a parent is in the tree before its children.
  function placeHiddenBlocks(parentId: string | undefined) {
    const parent = parentId === undefined ? root : nodeOf.get(parentId);
    const siblings = source.childrenOf(parentId);
    if (parent !== undefined) {
      const present = new Set(parent.children.map((child) => child.id));
      // The hidden blocks to insert after each block (or first, for `undefined`).
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
      placeHiddenBlocks(id);
    }
  }
  placeHiddenBlocks(undefined);

  return { target: root.children, warnings };
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

/**
 * Finds the source blocks without a view block that stay, and adds them to
 * `kept`. The text cannot remove these blocks, thus they stay. There are two
 * exceptions:
 *
 * - The planner removes their parent.
 * - The planner removes all the visible blocks around them, and no block in
 *   them stays. An example is an empty paragraph between two removed
 *   paragraphs.
 */
function keepInvisibleBlocks(
  source: BlockTree,
  invisibleIds: ReadonlySet<string>,
  kept: Set<string>,
) {
  function hasKeptDescendant(id: string): boolean {
    return source
      .childrenOf(id)
      .some((child) => kept.has(child) || hasKeptDescendant(child));
  }

  // The nearest visible sibling before and after each block. One pass for
  // each list of siblings, thus the time is linear.
  const neighborsOf = new Map<string, string[]>();
  for (const parentId of [undefined, ...source.ids]) {
    const siblings = source.childrenOf(parentId);
    const before: (string | undefined)[] = [];
    let previous: string | undefined;
    for (const id of siblings) {
      before.push(previous);
      if (!invisibleIds.has(id)) {
        previous = id;
      }
    }
    let next: string | undefined;
    for (let i = siblings.length - 1; i >= 0; i--) {
      neighborsOf.set(
        siblings[i],
        [before[i], next].filter((neighbor) => neighbor !== undefined),
      );
      if (!invisibleIds.has(siblings[i])) {
        next = siblings[i];
      }
    }
  }

  // In document order. Thus, the decision for the parent of a block comes first.
  for (const id of source.ids) {
    if (!invisibleIds.has(id)) {
      continue;
    }
    const parentId = source.parent(id);
    if (parentId !== undefined && !kept.has(parentId)) {
      continue;
    }
    const neighbors = neighborsOf.get(id) ?? [];
    if (
      hasKeptDescendant(id) ||
      neighbors.length === 0 ||
      neighbors.some((neighbor) => kept.has(neighbor))
    ) {
      kept.add(id);
    }
  }
}

/** Returns true for a block with inline content and no text. */
function isEmptyTextBlock(block: LensBlock): boolean {
  return Array.isArray(block.content) && blockToText(block) === "";
}
