import type { Node } from "prosemirror-model";
import {
  getBlockInfo,
  getNearestBlockPos,
} from "../api/getBlockInfoFromPos.js";
import { getNodeById } from "../api/nodeUtil.js";
import type { BlockId, Location, PMLocation, Point, Range } from "./types.js";
import {
  getBlockRange,
  isBlockId,
  isBlockIdentifier,
  isPoint,
  isRange,
  normalizeToRange,
} from "./utils.js";
import { TextSelection, Transaction } from "prosemirror-state";
import { docToBlocks } from "../api/nodeConversions/nodeToBlock.js";
import { Block } from "../blocks/index.js";

/**
 * Resolves a {@link Location} to a {@link PMLocation}.
 */
export function resolveLocation(doc: Node, location: Location): PMLocation {
  if (isBlockId(location)) {
    return resolveBlockToPM(doc, location);
  }
  if (isBlockIdentifier(location)) {
    return resolveBlockToPM(doc, location.id);
  }
  if (isPoint(location)) {
    return resolvePointToPM(doc, location);
  }
  if (isRange(location)) {
    return resolveRangeToPM(doc, location);
  }
  throw new Error("Invalid location type", { cause: { location } });
}

/**
 * Resolves a {@link BlockId} to a {@link PMLocation}.
 */
export function resolveBlockToPM(doc: Node, blockId: BlockId): PMLocation {
  const posInfo = getNodeById(blockId, doc);
  if (!posInfo) {
    // TODO should we be throwing errors here?
    throw new Error(`Block with ID ${blockId} not found`);
  }
  const blockInfo = getBlockInfo(posInfo);

  return {
    anchor: blockInfo.bnBlock.beforePos,
    head: blockInfo.bnBlock.afterPos - 1,
  };
}

/**
 * Resolves a {@link Point} to a {@link PMLocation}.
 */
export function resolvePointToPM(doc: Node, point: Point): PMLocation {
  const block = resolveBlockToPM(doc, point.id);
  if (point.offset === -1) {
    return {
      anchor: block.anchor,
      head: block.head,
    };
  }

  const head = block.anchor + point.offset + 1;

  if (head > block.head) {
    // TODO should this just clamp?
    throw new Error(
      `Invalid offset: ${point.offset} exceeds block length ${block.head - block.anchor}`,
    );
  }

  return {
    anchor: head,
    head,
  };
}

/**
 * Resolves a {@link Range} to a {@link PMLocation}.
 * @note If the range has overlap, the {@link PMLocation.anchor} will be the lower bound and the {@link PMLocation.head} will be the upper bound.
 */
export function resolveRangeToPM(doc: Node, range: Range): PMLocation {
  const anchorResolved = resolvePointToPM(doc, range.anchor);
  const headResolved = resolvePointToPM(doc, range.head);

  const anchorMin = Math.min(anchorResolved.anchor, anchorResolved.head);
  const anchorMax = Math.max(anchorResolved.anchor, anchorResolved.head);
  const headMin = Math.min(headResolved.anchor, headResolved.head);
  const headMax = Math.max(headResolved.anchor, headResolved.head);

  if (anchorMax < headMin) {
    // Anchor range is fully below head range
    return {
      anchor: anchorMin,
      head: headMax,
    };
  } else if (headMax < anchorMin) {
    // Head range is fully below anchor range
    return {
      anchor: anchorMax,
      head: headMin,
    };
  } else {
    // Ranges overlap, just return the min/max to fulfill the range
    return {
      anchor: Math.min(anchorMin, headMin),
      head: Math.max(anchorMax, headMax),
    };
  }
}

/**
 * Resolves a {@link PMLocation} to a {@link Point} or {@link Range}, depending on if the {@link PMLocation} points to a single block or a range of blocks.
 */
export function resolvePMToLocation(
  doc: Node,
  pmLocation: PMLocation,
): Point | Range {
  const anchorBlockPos = getNearestBlockPos(doc, pmLocation.anchor);
  const headBlockPos =
    pmLocation.anchor === pmLocation.head
      ? anchorBlockPos
      : getNearestBlockPos(doc, pmLocation.head);

  // clamp the offsets to be within -1 (the block itself) and the block's node size
  const anchorOffset = Math.min(
    Math.max(pmLocation.anchor - anchorBlockPos.posBeforeNode - 1, -1),
    anchorBlockPos.node.firstChild?.nodeSize ?? Number.MAX_SAFE_INTEGER,
  );
  const headOffset = Math.min(
    Math.max(pmLocation.head - headBlockPos.posBeforeNode - 1, -1),
    headBlockPos.node.firstChild?.nodeSize ?? Number.MAX_SAFE_INTEGER,
  );

  if (anchorBlockPos.node === headBlockPos.node) {
    // pointing to the same block, so we will return a point
    if (
      anchorOffset === -1 &&
      headOffset === (headBlockPos.node.firstChild?.nodeSize ?? 0)
    ) {
      // We may be pointing to the whole block, so we need to check the block size
      return {
        id: anchorBlockPos.node.attrs.id,
        offset: -1,
      };
    }

    // Only if the offsets are the same, we can return a point
    if (headOffset === anchorOffset) {
      return {
        id: anchorBlockPos.node.attrs.id,
        offset: headOffset,
      };
    }
  }

  // pointing to different blocks, return a range
  return {
    anchor: {
      id: anchorBlockPos.node.attrs.id,
      offset: anchorOffset,
    },

    head: {
      id: headBlockPos.node.attrs.id,
      offset: headOffset,
    },
  };
}

/**
 * Returns the block's {@link PMLocation} at the given {@link Location}
 */
export function getBlockPosAt(doc: Node, location: Location): PMLocation {
  const [blockId, otherBlockId] = getBlockRange(location);
  if (blockId !== otherBlockId) {
    throw new Error(
      "Block is ambiguous, given a range of blocks to get the start of: " +
        JSON.stringify(location),
      { cause: { location } },
    );
  }
  return resolveBlockToPM(doc, blockId);
}

/**
 * Returns the block's start position at the given {@link Location}
 */
export function getBlockStartPos(doc: Node, location: Location): number {
  const block = getBlockPosAt(doc, location);
  return block.anchor;
}

/**
 * Returns the block's end position at the given {@link Location}
 */
export function getBlockEndPos(doc: Node, location: Location): number {
  const block = getBlockPosAt(doc, location);
  return block.head;
}

/**
 * Returns the blocks at the given {@link Location}
 */
export function getBlocksAt(
  doc: Node,
  location: Location,
  opts: {
    /**
     * Whether to include child blocks as part of the response
     * @default true
     */
    includeChildren: boolean;
  } = {
    includeChildren: true,
  },
) {
  const [blockId1, blockId2] = getBlockRange(location);
  const blocks = docToBlocks(doc);
  const allBlocks: typeof blocks = [];
  for (const block of blocks) {
    allBlocks.push(block);
    if (opts.includeChildren && block.children) {
      for (const child of block.children) {
        allBlocks.push(child);
      }
    }
  }
  const block1 = allBlocks.findIndex((block) => block.id === blockId1);
  const block2 = allBlocks.findIndex((block) => block.id === blockId2);
  if (block1 === -1 || block2 === -1) {
    throw new Error("Block not found", { cause: { blockId1, blockId2 } });
  }
  return allBlocks.slice(
    Math.min(block1, block2),
    Math.max(block1, block2) + 1,
  );
}

/**
 * Returns the selection's {@link Range} at the given {@link Transaction}'s selection
 */
export function getSelectionLocation(tr: Transaction): {
  /**
   * Meta information about the current selection.
   */
  meta: {
    /**
     * The underlying location of the current selection.
     *
     * If the selection is a single cursor, this will be a {@link Point}.
     * If the selection is a selection range, this will be a {@link Range}.
     */
    location: Point | Range;
  };
  /**
   * The range of the current selection.
   * @note This is the same as the {@link meta.location} but normalized to a {@link Range}.
   */
  range: Range;
  /**
   * The blocks that the current selection spans across.
   */
  blocks: Block[];
  // TODO should this be selection cut blocks?
  content: Block[];
} {
  const selection = tr.selection;

  const location = resolvePMToLocation(tr.doc, {
    anchor: selection.anchor,
    head: selection.head,
  });

  return {
    meta: { location },
    range: normalizeToRange(location),
    get blocks() {
      return getBlocksAt(tr.doc, location) as any;
    },
    content: [],
  };
}

export function setSelectionLocation(tr: Transaction, location: Location) {
  const resolved = resolveLocation(tr.doc, location);
  tr.setSelection(TextSelection.create(tr.doc, resolved.anchor, resolved.head));
}
