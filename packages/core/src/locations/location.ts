import type { Node } from "prosemirror-model";
import {
  getBlockInfo,
  getNearestBlockPos,
} from "../api/getBlockInfoFromPos.js";
import { getNodeById } from "../api/nodeUtil.js";
import type { BlockId, Location, PMLocation, Point, Range } from "./types.js";
import { isBlockId, isBlockIdentifier, isPoint, isRange } from "./utils.js";

export function resolveLocation(
  doc: Node,
  location: Location,
  // TODO
  // opts: {
  //   /**
  //    * Whether to include child blocks as part of the response
  //    * @default true
  //    */
  //   includeChildren: boolean;
  // },
): PMLocation {
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
    anchor: blockInfo.bnBlock.beforePos + 1,
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
      `Offset ${point.offset} exceeds block length ${block.head - block.anchor}`,
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
    Math.max(pmLocation.anchor - anchorBlockPos.posBeforeNode - 2, -1),
    anchorBlockPos.node.firstChild?.nodeSize ?? Number.MAX_SAFE_INTEGER,
  );
  const headOffset = Math.min(
    Math.max(pmLocation.head - headBlockPos.posBeforeNode - 2, -1),
    headBlockPos.node.firstChild?.nodeSize ?? Number.MAX_SAFE_INTEGER,
  );

  if (anchorBlockPos.node === headBlockPos.node) {
    // pointing to the same block, so we will return a point
    if (
      anchorOffset === -1 &&
      headOffset === (headBlockPos.node.firstChild?.nodeSize ?? 0) - 1
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
