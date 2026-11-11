import type { BlockFields, FlatBlock, LensBlock } from "../model.js";
import type { BlockIndex } from "../util/blocks/index.js";
import { decideParents, keyOf, type Place } from "./hiddenNesting.js";
import type { TargetRow } from "./types.js";

export type { TargetRow } from "./types.js";

/**
 * Builds the target document in two passes:
 *
 * 1. The parent of each block (see `decideParents`): the blocks of the rows
 *    in the order of the text, in the parent that the text shows, or in a
 *    nesting that the format does not show.
 * 2. The hidden blocks that stay go to their source positions (see
 *    {@link placeHiddenBlocks}).
 *
 * @internal
 */
export function buildTargetDocument(input: {
  rows: readonly TargetRow[];
  /** The blocks of the text, in a flat list (for their parents and types). */
  incoming: readonly FlatBlock[];
  /** The view blocks (for their parents and types). */
  view: readonly FlatBlock[];
  source: BlockIndex;
  invisibleIds: ReadonlySet<string>;
  /** The source blocks that stay (see `Correspondence.kept`). */
  kept: ReadonlySet<string>;
  /** Gives the ID of a new block. */
  newId: () => string;
}): LensBlock[] {
  const { rows, source } = input;
  const root = blockFromFields("", { type: "", props: {}, content: undefined });
  /** The block of each place in the target. */
  const blocksByPlace = new Map<string, LensBlock>([
    [keyOf({ kind: "root" }), root],
  ]);
  /** The block of each source block in the target: a kept block or a hidden ancestor. */
  const blocksBySourceId = new Map<string, LensBlock>();

  function create(place: Place): LensBlock {
    switch (place.kind) {
      case "root":
        throw new Error("The root is not a step of the build");
      case "hidden": {
        const block = blockFromFields(place.id, source.block(place.id));
        blocksBySourceId.set(place.id, block);
        return block;
      }
      case "row": {
        const row = rows[place.index];
        switch (row.kind) {
          case "skipped":
            throw new Error("A skipped row is not a step of the build");
          case "new":
            return blockFromFields(input.newId(), row.fields);
          case "kept": {
            const block = blockFromFields(row.id, row.fields);
            blocksBySourceId.set(row.id, block);
            return block;
          }
        }
      }
    }
  }

  for (const { block, parent } of decideParents(input)) {
    const created = create(block);
    // `decideParents` gives a step for a parent before the steps of its
    // children.
    const parentBlock = blocksByPlace.get(keyOf(parent));
    if (parentBlock === undefined) {
      throw new Error(`The parent ${keyOf(parent)} is not in the target yet`);
    }
    parentBlock.children.push(created);
    blocksByPlace.set(keyOf(block), created);
  }
  placeHiddenBlocks(
    root,
    blocksBySourceId,
    source,
    input.invisibleIds,
    input.kept,
  );
  return root.children;
}

/**
 * The hidden blocks that stay and are not in the target yet go to their source
 * positions: in their parent, after the last earlier sibling that is there.
 * In document order, thus a parent is in the target before its children.
 */
function placeHiddenBlocks(
  root: LensBlock,
  blocksBySourceId: Map<string, LensBlock>,
  source: BlockIndex,
  invisibleIds: ReadonlySet<string>,
  kept: ReadonlySet<string>,
) {
  function place(parentId: string | undefined) {
    const parent =
      parentId === undefined ? root : blocksBySourceId.get(parentId);
    const siblings = source.childrenOf(parentId);
    if (parent !== undefined) {
      const present = new Set(parent.children.map((child) => child.id));
      // The hidden blocks after each present block (first for
      // `undefined`), in source order.
      const after = new Map<string | undefined, LensBlock[]>();
      let last: string | undefined;
      for (const id of siblings) {
        if (invisibleIds.has(id) && kept.has(id) && !blocksBySourceId.has(id)) {
          const block = blockFromFields(id, source.block(id));
          blocksBySourceId.set(id, block);
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
