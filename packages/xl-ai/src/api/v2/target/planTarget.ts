import { blockKey } from "../blocks/json.js";
import { blockToText } from "../blocks/text.js";
import { BlockTree } from "../blocks/tree.js";
import {
  type BlockFields,
  type ContentKind,
  type FlatBlock,
  inlineContentOf,
  type LensBlock,
  type LensInlineContent,
} from "../blocks/types.js";
import type { BlockPair, TextMove } from "../alignment/alignBlocks.js";
import { mergeBlock } from "../merge/block.js";
import { mergeGroupContent, type TextGroup } from "../merge/group.js";
import type { Projection } from "../projection/projectDocument.js";

export type PlanWarning =
  /**
   * The text moved, removed or split a part of a block that renders as more
   * than one view block, or that block has no text. An example is a code
   * block with blank lines, in plain text. The blocks of the text replace
   * the block. Thus, the data that the format does not show is lost. A
   * change of the text of the parts merges into the block (see
   * `joinParts`).
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
  /** The blocks of the text, in a flat list. */
  incoming: FlatBlock[];
  /** The matches of `projection.view` (a side) to `incoming` (b side). */
  alignment: BlockPair[];
  /** Experimental: the text that a split or a join moved (see `alignBlocksAndMoves`). */
  moves?: readonly TextMove[];
  contentKindOf: (type: string) => ContentKind;
  /** The text that the format shows for an inline item that it does not give back (see `MergeOptions.shadowOf`). */
  shadowOf?: (item: LensInlineContent) => string | undefined;
  /** Gives the ID of a new block. */
  newId: () => string;
};

export type Plan = {
  target: LensBlock[];
  warnings: PlanWarning[];
  /** Experimental: the splits and joins of the text, for the rebase (see `TextGroup`). */
  groups: TextGroup[];
};

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
 *   parent, it also removes them. An empty hidden block (for example an
 *   empty paragraph) also goes if the planner removes all the visible blocks
 *   around it.
 * - Experimental, with `moves`: the content of the blocks between which a
 *   split or a join moved text merges as one text (see `textGroups`).
 */
export function planTarget(input: PlanInput): Plan {
  const { view, invisibleIds, multiParts } = input.projection;
  const { incoming, contentKindOf } = input;
  const source = new BlockTree(input.document);
  const warnings: PlanWarning[] = [];

  const viewToIncoming = new Int32Array(view.length).fill(-1);
  const incomingToView = new Int32Array(incoming.length).fill(-1);
  /** The blocks of the text that the text moved (rule 2 of `alignBlocks`). */
  const moved = new Set<number>();
  for (const pair of input.alignment) {
    viewToIncoming[pair.aIndex] = pair.bIndex;
    incomingToView[pair.bIndex] = pair.aIndex;
    if (pair.moved) {
      moved.add(pair.bIndex);
    }
  }

  // 1. Find the source blocks that stay, and the block of the text for each.
  // A multi-part block stays if its parts are in the text, next to each
  // other, in the same order. If the text changed a part, the parts join
  // again (see `joinParts`), and the joined text merges as the block. Else,
  // the blocks of the text replace the block.
  const replaced = new Set<string>();
  /** The block of the text that replaces a multi-part block and keeps its ID. */
  const replacementIdOf = new Map<number, string>();
  const joined = new Map<string, { view: LensBlock; incoming: LensBlock }>();
  for (const [id, parts] of multiParts) {
    const together = parts.every((v, k) => {
      const j = viewToIncoming[v];
      return j !== -1 && (k === 0 || j === viewToIncoming[parts[k - 1]] + 1);
    });
    const textParts = together
      ? parts.map((v) => incoming[viewToIncoming[v]].block)
      : [];
    const viewParts = parts.map((v) => view[v].block);
    if (
      together &&
      viewParts.every((part, k) => blockKey(part) === blockKey(textParts[k]))
    ) {
      continue;
    }
    const join = together
      ? joinParts(source.block(id), viewParts, textParts)
      : undefined;
    if (join === undefined) {
      replaced.add(id);
      warnings.push({ type: "multi-part-block-replaced", id });
      // The block of the text with the largest part keeps the ID, as for a
      // split block. Thus, two writers that replace the block do not both
      // add its text.
      let largest: number | undefined;
      for (const v of parts) {
        const j = viewToIncoming[v];
        if (
          j !== -1 &&
          (largest === undefined ||
            blockToText(view[v].block).length >
              blockToText(view[incomingToView[largest]].block).length)
        ) {
          largest = j;
        }
      }
      if (largest !== undefined) {
        replacementIdOf.set(largest, id);
      }
    } else {
      joined.set(id, join);
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
  /**
   * Experimental. Finds the groups of blocks between which a split or a join
   * moved text: the blocks that `moves` (see `alignBlocksAndMoves`) and their
   * pairs connect. Merges the content of each group as one text (see
   * `mergeGroupContent`): `base` is the view, `ours` is the text, and
   * `theirs` is the document. Thus, the moved text keeps its hidden styles. A
   * block of the text in a pair merges its type and props with its pair. A
   * new block gets the type and the props of the text. Returns the groups, and
   * the ID and the merged fields of each block of the text in a group.
   *
   * A group has only blocks with content of one kind (inline or plain), and
   * each view block in it has its own source block. Else, its blocks merge
   * one by one. Examples are a block that the format shows as more than one
   * view block, and a paragraph that the text joins to a code block: the plain
   * content of a code block cannot hold the inline items of the paragraph.
   */
  function textGroups() {
    const { moves = [] } = input;
    const groups: TextGroup[] = [];
    const pieces = new Map<number, { id: string; fields: BlockFields }>();
    if (moves.length === 0) {
      return { groups, pieces };
    }
    // The moves and the pairs of their blocks come from one diff, thus they do
    // not cross. In this order, a group is a run of edges in which each edge
    // has a block of the edge before it.
    const movedA = new Set(moves.map((move) => move.aIndex));
    const movedB = new Set(moves.map((move) => move.bIndex));
    const edges = [
      ...moves,
      ...input.alignment.filter(
        (pair) => movedA.has(pair.aIndex) || movedB.has(pair.bIndex),
      ),
    ].sort((x, y) => x.aIndex - y.aIndex || x.bIndex - y.bIndex);
    const runs: (typeof edges)[] = [];
    for (const edge of edges) {
      const last = runs.at(-1)?.at(-1);
      if (last?.aIndex === edge.aIndex || last?.bIndex === edge.bIndex) {
        runs.at(-1)?.push(edge);
      } else {
        runs.push([edge]);
      }
    }

    for (const run of runs) {
      const views = [...new Set(run.map((edge) => edge.aIndex))];
      const texts = [...new Set(run.map((edge) => edge.bIndex))];
      const sources = views.map((v) => view[v].sourceId);
      // The blocks of the text have text, thus inline or plain content.
      const kinds = new Set(
        texts.map((j) => contentKindOf(incoming[j].block.type)),
      );
      if (
        kinds.size > 1 ||
        texts.some((j) => skipped.has(j)) ||
        !sources.every(
          (id): id is string =>
            id !== undefined &&
            !multiParts.has(id) &&
            kinds.has(contentKindOf(source.block(id).type)),
        )
      ) {
        continue;
      }
      const ids = texts.map((j) => keptIdOf[j] ?? input.newId());
      const merged = mergeGroupContent(
        views.map((v, k) => ({
          id: sources[k],
          content: inlineContentOf(view[v].block),
        })),
        texts.map((j, k) => ({
          id: ids[k],
          content: inlineContentOf(incoming[j].block),
        })),
        sources.map((id) => ({
          id,
          content: inlineContentOf(source.block(id)),
        })),
        { shadowOf: input.shadowOf },
      );
      texts.forEach((j, k) => {
        const content = merged.get(ids[k]);
        // In the planner, the text wins each conflict. Thus, each block of the
        // text keeps its break.
        if (content === undefined) {
          throw new Error(`The merge of a group lost block ${ids[k]}`);
        }
        const v = incomingToView[j];
        const text = incoming[j].block;
        pieces.set(j, {
          id: ids[k],
          fields:
            v === -1
              ? { ...text, content }
              : mergeBlock(
                  view[v].block,
                  text,
                  source.block(sources[views.indexOf(v)]),
                  contentKindOf,
                  { content },
                ),
        });
      });
      groups.push({ base: sources, ours: ids });
    }
    return { groups, pieces };
  }
  const { groups, pieces } = textGroups();

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
  function nestingUnchanged(j: number): boolean {
    const textParentIndex = incoming[j].parentIndex;
    const viewParentIndex = view[incomingToView[j]].parentIndex;
    return textParentIndex === undefined
      ? viewParentIndex === undefined
      : incomingToView[textParentIndex] === viewParentIndex &&
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
    return next !== undefined ? sourceParent(keptIdOf[next]!) : undefined;
  }

  // The index of the first kept block at or after each index, from the end.
  const keptFrom = new Int32Array(incoming.length + 1).fill(-1);
  for (let k = incoming.length - 1; k >= 0; k--) {
    keptFrom[k] =
      !skipped.has(k) && keptIdOf[k] !== undefined ? k : keptFrom[k + 1];
  }

  /**
   * The index of the next kept block after block `j`, if it has the same
   * text parent and keeps the nesting of its view block. Else `undefined`.
   */
  function nextKept(j: number): number | undefined {
    const next = keptFrom[j + 1];
    return next !== -1 &&
      incoming[next].parentIndex === incoming[j].parentIndex &&
      nestingUnchanged(next)
      ? next
      : undefined;
  }

  /**
   * The parent of kept block `j` (with the source ID `id`) in the target:
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
  function keptParent(j: number, id: string): LensBlock {
    if (!nestingUnchanged(j)) {
      return textParent(j);
    }
    const asNew = () => nestingOfNext(j) ?? textParent(j);
    if (moved.has(j) && !isNearHiddenAncestor(j, id)) {
      return asNew();
    }
    const parent = sourceParent(id);
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
      next === undefined ? [] : hiddenAncestors(keptIdOf[next]!),
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
      hiddenAncestors(keptIdOf[next]!).some((ancestor) => {
        const block = nodeOf.get(ancestor);
        return block !== undefined && stack.indexOf(block) > depth;
      })
    );
  }

  for (let j = 0; j < incoming.length; j++) {
    if (skipped.has(j)) {
      continue;
    }
    const id = keptIdOf[j];
    const piece = pieces.get(j);
    if (id === undefined) {
      const block = node(
        replacementIdOf.get(j) ?? piece?.id ?? input.newId(),
        piece?.fields ?? incoming[j].block,
      );
      attach(block, nestingOfNext(j) ?? textParent(j));
      nodes[j] = block;
      continue;
    }
    const viewBlock = joined.get(id)?.view ?? view[incomingToView[j]].block;
    const textBlock = joined.get(id)?.incoming ?? incoming[j].block;
    const merged =
      piece?.fields ??
      mergeBlock(viewBlock, textBlock, source.block(id), contentKindOf, {
        shadowOf: input.shadowOf,
      });
    if (
      viewBlock.type === textBlock.type &&
      merged.type !== source.block(id).type
    ) {
      warnings.push({ type: "block-shape-replaced", id });
    }
    const block = node(id, merged);
    attach(block, keptParent(j, id));
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

  return { target: root.children, warnings, groups };
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

/**
 * The parts of a multi-part block in the view and in the text, joined to
 * one block each, with the text that is between the parts in the source
 * block. Thus, a change of the text of a part is a change of the block (for
 * example a code block with a blank line, in plain text). `undefined` if the
 * block or a part has no text, or if the text of the source block does not
 * contain the parts of the view, in order.
 */
function joinParts(
  sourceBlock: LensBlock,
  viewParts: readonly LensBlock[],
  textParts: readonly LensBlock[],
): { view: LensBlock; incoming: LensBlock } | undefined {
  const parts = [...viewParts, ...textParts];
  if (
    !Array.isArray(sourceBlock.content) ||
    !parts.every((part) => Array.isArray(part.content))
  ) {
    return undefined;
  }
  const sourceText = blockToText(sourceBlock);
  /** The text before each part, and after the last part. */
  const between: string[] = [];
  let cursor = 0;
  for (const part of viewParts) {
    const text = blockToText(part);
    const at = sourceText.indexOf(text, cursor);
    if (at === -1) {
      return undefined;
    }
    between.push(sourceText.slice(cursor, at));
    cursor = at + text.length;
  }
  between.push(sourceText.slice(cursor));
  const textItem = (text: string): LensInlineContent[] =>
    text === "" ? [] : [{ type: "text", text, styles: {} }];
  function join(blocks: readonly LensBlock[]): LensBlock {
    return {
      ...blocks[0],
      content: [
        ...blocks.flatMap((block, k) => [
          ...textItem(between[k]),
          ...(block.content as LensInlineContent[]),
        ]),
        ...textItem(between[blocks.length]),
      ],
    };
  }
  return { view: join(viewParts), incoming: join(textParts) };
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
 * - An empty block (for example an empty paragraph) goes if the planner
 *   removes all the visible blocks around it. An example is an empty
 *   paragraph between two removed paragraphs. In a document with only empty
 *   blocks at the top level (for example a new editor), these blocks go:
 *   the text gives all blocks. A hidden block with data
 *   (for example a table in plain text) stays, because the text cannot show
 *   it.
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

  // A document with only empty blocks at the top level (for example a new
  // editor) has no content that the text did not give.
  const topHasContent = source
    .childrenOf(undefined)
    .some((id) => !isEmptyBlock(source.block(id)));

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
      !isEmptyBlock(source.block(id)) ||
      hasKeptDescendant(id) ||
      neighbors.some((neighbor) => kept.has(neighbor)) ||
      // An empty block without visible siblings stays in a kept parent, and
      // at a top level with other content (for example next to column lists
      // that the format does not show).
      (neighbors.length === 0 && (parentId !== undefined || topHasContent))
    ) {
      kept.add(id);
    }
  }
}

/** Returns true for a block with inline content, without text and without children. */
function isEmptyBlock(block: LensBlock): boolean {
  return isEmptyTextBlock(block) && block.children.length === 0;
}

/** Returns true for a block with inline content and no text. */
function isEmptyTextBlock(block: LensBlock): boolean {
  return Array.isArray(block.content) && blockToText(block) === "";
}
