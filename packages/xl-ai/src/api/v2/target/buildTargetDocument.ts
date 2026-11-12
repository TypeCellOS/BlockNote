import type { BlockFields, FlatBlock, LensBlock } from "../model.js";
import type { ViewBlock } from "../projection/index.js";
import type { BlockIndex } from "../util/blocks/index.js";
import { decideParents, ROOT } from "./hiddenNesting.js";
import type { TargetRow } from "./types.js";

export type { TargetRow } from "./types.js";

/**
 * Builds the target document in two passes:
 *
 * 1. The parent of each block (see `decideParents`): the blocks of the rows
 *    in the order of the text, in the parent that the text shows, or in a
 *    nesting that the format does not show.
 * 2. The invisible blocks that stay go to their source positions (see
 *    {@link placeInvisibleBlocks}).
 *
 * @internal
 */
export function buildTargetDocument(input: {
  rows: readonly TargetRow[];
  /** The blocks of the text, in a flat list (for their parents and types). */
  textBlocks: readonly FlatBlock[];
  /** The view blocks (for their parents and types). */
  view: readonly ViewBlock[];
  sourceIndex: BlockIndex;
  invisibleIds: ReadonlySet<string>;
  /** The source blocks that stay (see `withInvisibleBlocks`). */
  staying: ReadonlySet<string>;
}): LensBlock[] {
  const { rows, sourceIndex } = input;
  const root = blockFromFields("", { type: "", props: {}, content: undefined });
  const rowOf = new Map(rows.map((row) => [row.id, row]));
  /** The block of each block ID in the target: a row or an invisible ancestor. */
  const blocksById = new Map<string, LensBlock>();

  for (const { block, parent } of decideParents(input)) {
    const row = rowOf.get(block);
    const created = blockFromFields(
      block,
      row !== undefined ? row.fields : sourceIndex.block(block),
    );
    // `decideParents` gives a step for a parent before the steps of its
    // children.
    const parentBlock = parent === ROOT ? root : blocksById.get(parent);
    if (parentBlock === undefined) {
      throw new Error(`The parent ${String(parent)} is not in the target yet`);
    }
    parentBlock.children.push(created);
    blocksById.set(block, created);
  }
  placeInvisibleBlocks(
    root,
    blocksById,
    sourceIndex,
    input.invisibleIds,
    input.staying,
  );
  return root.children;
}

/**
 * The invisible blocks that stay and are not in the target yet go to their
 * source positions: in their parent, after the last earlier sibling that is
 * there. In document order, thus a parent is in the target before its
 * children.
 */
function placeInvisibleBlocks(
  root: LensBlock,
  blocksById: Map<string, LensBlock>,
  sourceIndex: BlockIndex,
  invisibleIds: ReadonlySet<string>,
  staying: ReadonlySet<string>,
) {
  function place(parentId: string | undefined) {
    const parent = parentId === undefined ? root : blocksById.get(parentId);
    const siblings = sourceIndex.childrenOf(parentId);
    if (parent !== undefined) {
      const present = new Set(parent.children.map((child) => child.id));
      // The invisible blocks after each present block (first for
      // `undefined`), in source order.
      const after = new Map<string | undefined, LensBlock[]>();
      let last: string | undefined;
      for (const id of siblings) {
        if (invisibleIds.has(id) && staying.has(id) && !blocksById.has(id)) {
          const block = blockFromFields(id, sourceIndex.block(id));
          blocksById.set(id, block);
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

/** A block with the ID and the fields, without children. */
function blockFromFields(id: string, fields: BlockFields): LensBlock {
  const { type, props, content } = fields;
  return { id, type, props, content, children: [] };
}
