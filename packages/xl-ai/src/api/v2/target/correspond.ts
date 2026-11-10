import type {
  BlockWithoutChildren,
  FlatBlock,
  LensBlock,
  LensInlineContent,
} from "../model.js";
import { blockKey, blockToText, type BlockTree } from "../util/blocks/index.js";
import type { BlockPair } from "../alignment/index.js";
import type { Projection } from "../projection/index.js";
import type { TargetWarning } from "./types.js";

/** What the plan does with one block of the text. */
export type TextRow =
  /**
   * The text block is a source block that stays (`id`). Its fields merge
   * three-way: `base` is the view block, `text` is the text block, and
   * `theirs` is the source block. For a multi-part block, `base` and `text`
   * are its parts, joined (see {@link joinParts}).
   */
  | {
      kind: "kept";
      id: string;
      viewIndex: number;
      base: BlockWithoutChildren;
      text: BlockWithoutChildren;
      /** The text moved the block (rule 2 of `alignBlocks`). */
      moved: boolean;
    }
  /**
   * A new block. `id` is the ID of the multi-part block that it replaces, if
   * it is the block with the largest part. Else, the block gets a new ID.
   */
  | { kind: "new"; viewIndex: number | undefined; id: string | undefined }
  /**
   * The text block gives no block: it is a later part of a kept multi-part
   * block (the first part is the block), or the pair of a view block without
   * a link (the target stage cannot apply a change of it).
   */
  | { kind: "skipped"; viewIndex: number | undefined };

/** The correspondence of the text blocks and the source blocks. */
export type Correspondence = {
  /** One row for each block of the text, in the order of the text. */
  rows: TextRow[];
  /**
   * The source blocks that stay: the source blocks of the kept rows, and
   * the invisible blocks that stay (see {@link keepInvisibleBlocks}).
   */
  kept: Set<string>;
  warnings: TargetWarning[];
};

/**
 * Finds what the plan does with each block of the text: which source block
 * it is, if it is one (see {@link TextRow}). Also finds the source blocks
 * that stay.
 *
 * - A source block with a pair in the text stays.
 * - A multi-part block stays if its parts are in the text, next to each
 *   other, in the same order. If the text changed a part, the parts join
 *   again (see {@link joinParts}), and the joined text merges as the block.
 *   Else, the blocks of the text replace the block (warning
 *   `multi-part-block-replaced`).
 * - The text cannot change a view block without a link (warning
 *   `unlinked-block-changed`, unless the view block is empty).
 * - An invisible block stays, with some exceptions (see
 *   {@link keepInvisibleBlocks}).
 *
 * Method: our own design.
 */
export function correspond(
  input: {
    projection: Projection;
    /** The blocks of the text, in a flat list. */
    incoming: readonly FlatBlock[];
    /** The pairs of `projection.view` (a side) and `incoming` (b side). */
    alignment: readonly BlockPair[];
  },
  source: BlockTree,
): Correspondence {
  const { view, invisibleIds } = input.projection;
  const { incoming } = input;
  /** The text block of each view block, and the view block of each text block. */
  const textIndexOf: (number | undefined)[] = new Array(view.length);
  const viewIndexOf: (number | undefined)[] = new Array(incoming.length);
  const moved = new Set<number>();
  for (const pair of input.alignment) {
    textIndexOf[pair.aIndex] = pair.bIndex;
    viewIndexOf[pair.bIndex] = pair.aIndex;
    if (pair.moved) {
      moved.add(pair.bIndex);
    }
  }

  const multiParts = decideMultiParts(
    input.projection,
    incoming,
    textIndexOf,
    source,
  );
  const warnings: TargetWarning[] = [...multiParts.warnings];
  const kept = new Set<string>();
  /** The kept source block of each text block that is one. */
  const keptAt = new Map<number, { id: string; viewIndex: number }>();
  const skipped = new Set<number>();
  view.forEach((viewBlock, v) => {
    const j = textIndexOf[v];
    const { sourceId } = viewBlock;
    if (sourceId === undefined) {
      const unchanged =
        j !== undefined &&
        blockKey(viewBlock.block) === blockKey(incoming[j].block);
      if (unchanged) {
        skipped.add(j);
      } else if (!isEmptyTextBlock(viewBlock.block)) {
        warnings.push({
          type: "unlinked-block-changed",
          text: blockToText(viewBlock.block),
        });
        if (j !== undefined) {
          skipped.add(j);
        }
      }
      // Else, the view block is empty, and has no source. The text cannot
      // change data of it, thus there is no warning, and its pair (if there
      // is one) is a block of the text.
    } else if (j !== undefined && !multiParts.replaced.has(sourceId)) {
      if (kept.has(sourceId)) {
        // Another part of a multi-part block. The first part is the block.
        skipped.add(j);
      } else {
        kept.add(sourceId);
        keptAt.set(j, { id: sourceId, viewIndex: v });
      }
    }
  });
  keepInvisibleBlocks(source, invisibleIds, kept);

  const rows = incoming.map((flat, j): TextRow => {
    const viewIndex = viewIndexOf[j];
    if (skipped.has(j)) {
      return { kind: "skipped", viewIndex };
    }
    const keptBlock = keptAt.get(j);
    if (keptBlock === undefined) {
      return { kind: "new", viewIndex, id: multiParts.replacementIdOf.get(j) };
    }
    const join = multiParts.joined.get(keptBlock.id);
    return {
      kind: "kept",
      id: keptBlock.id,
      viewIndex: keptBlock.viewIndex,
      base: join?.view ?? view[keptBlock.viewIndex].block,
      text: join?.incoming ?? flat.block,
      moved: moved.has(j),
    };
  });
  return { rows, kept, warnings };
}

/**
 * Decides for each multi-part block what the text did with its parts:
 *
 * - The parts are in the text, next to each other, in order, and without
 *   changes: nothing to decide (the first part is the block).
 * - The parts are in the text, next to each other, in order, with changes:
 *   the parts join (`joined`), if {@link joinParts} can join them.
 * - Else, the blocks of the text replace the block (`replaced`). The block
 *   of the text with the largest part keeps the ID, as for a split block
 *   (`replacementIdOf`). Thus, two writers that replace the block do not
 *   both add its text.
 */
function decideMultiParts(
  projection: Projection,
  incoming: readonly FlatBlock[],
  textIndexOf: readonly (number | undefined)[],
  source: BlockTree,
): {
  replaced: Set<string>;
  /** The text block that replaces a multi-part block and keeps its ID. */
  replacementIdOf: Map<number, string>;
  joined: Map<
    string,
    { view: BlockWithoutChildren; incoming: BlockWithoutChildren }
  >;
  warnings: TargetWarning[];
} {
  const { view, multiParts } = projection;
  const replaced = new Set<string>();
  const replacementIdOf = new Map<number, string>();
  const joined = new Map<
    string,
    { view: BlockWithoutChildren; incoming: BlockWithoutChildren }
  >();
  const warnings: TargetWarning[] = [];
  for (const [id, parts] of multiParts) {
    const together = parts.every((v, k) => {
      const j = textIndexOf[v];
      const previous = k === 0 ? undefined : textIndexOf[parts[k - 1]];
      return j !== undefined && (k === 0 || j === previous! + 1);
    });
    const textParts = together
      ? parts.map((v) => incoming[textIndexOf[v]!].block)
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
    if (join !== undefined) {
      joined.set(id, join);
      continue;
    }
    replaced.add(id);
    warnings.push({ type: "multi-part-block-replaced", id });
    let largest: { j: number; length: number } | undefined;
    for (const v of parts) {
      const j = textIndexOf[v];
      const length = blockToText(view[v].block).length;
      if (
        j !== undefined &&
        (largest === undefined || length > largest.length)
      ) {
        largest = { j, length };
      }
    }
    if (largest !== undefined) {
      replacementIdOf.set(largest.j, id);
    }
  }
  return { replaced, replacementIdOf, joined, warnings };
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
  sourceBlock: BlockWithoutChildren,
  viewParts: readonly BlockWithoutChildren[],
  textParts: readonly BlockWithoutChildren[],
): { view: BlockWithoutChildren; incoming: BlockWithoutChildren } | undefined {
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
  function join(blocks: readonly BlockWithoutChildren[]): BlockWithoutChildren {
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

/**
 * Finds the source blocks without a view block that stay, and adds them to
 * `kept`. The text cannot remove these blocks, thus they stay. There are two
 * exceptions:
 *
 * - The target stage removes their parent.
 * - An empty block (for example an empty paragraph) goes if the target stage
 *   removes all the visible blocks around it. An example is an empty
 *   paragraph between two removed paragraphs. In a document with only empty
 *   blocks at the top level (for example a new editor), these blocks go:
 *   the text gives all blocks. A hidden block with data
 *   (for example a table in plain text) stays, because the text cannot show
 *   it.
 */
// eslint-disable-next-line complexity -- Follow-up: split the rules for invisible blocks.
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
function isEmptyTextBlock(block: BlockWithoutChildren): boolean {
  return Array.isArray(block.content) && blockToText(block) === "";
}
