import type { Node } from "prosemirror-model";
import { getNodeById } from "../api/nodeUtil.js";
import type { BlockId, Location, PMLocation, Point, Range } from "./types.js";
import { isBlockId, isBlockIdentifier, isPoint, isRange } from "./utils.js";
import { getBlockInfo } from "../api/getBlockInfoFromPos.js";

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
  if (point.offset > block.head - block.anchor) {
    throw new Error(
      `Offset ${point.offset} exceeds block length ${block.head - block.anchor}`,
    );
  }

  /**
   * This counts characters & leaf inline nodes within the block as the unit of measurement.
   * This is slightly different than what ProseMirror does, but it's more intuitive for users.
   */

  let curOffset = 0;
  let foundPos = block.anchor;

  doc.nodesBetween(block.anchor, block.head, (node, pos) => {
    if (pos <= block.anchor || pos >= block.head) {
      return true;
    }

    let nodeLength = 0;
    if (node.type.isText) {
      // If the node is a text node, we can just use the length of the text
      nodeLength = node.text!.length;
    } else if (node.type.isInline && node.isLeaf) {
      // If the node is an inline leaf node, we can just use 1 to represent the node's position
      nodeLength = 1;
    }
    curOffset += nodeLength;

    if (curOffset <= point.offset) {
      return true;
    }

    // We've found the position within the node, but we may have overshot the target offset
    // So we need to subtract the amount we overshot from the found position
    foundPos = pos + (point.offset - (curOffset - nodeLength));
    return false;
  });

  return {
    anchor: foundPos,
    head: foundPos,
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
