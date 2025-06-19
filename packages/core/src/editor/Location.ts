/**
 * A block id is a unique identifier for a block, it is a string.
 */
export type BlockId = string;

/**
 * A block identifier is a unique identifier for a block, it is either a string, or can be object with an id property (out of convenience).
 */
export type BlockIdentifier = { id: BlockId } | BlockId;

/**
 * A point is a path with an offset, it is used to identify a specific position within a block.
 */
export type Point = {
  id: BlockId;
  offset: number;
};

/**
 * A range is a pair of points, it is used to identify a range of blocks within a document.
 */
export type Range = {
  anchor: Point;
  head: Point;
};

/**
 * A location is a path, point, or range, it is used to identify positions within a document.
 */
export type Location = BlockId | Point | Range;

export function toId(id: BlockIdentifier): BlockId {
  return typeof id === "string" ? id : id.id;
}

export function isBlockId(id: unknown): id is BlockId {
  return typeof id === "string";
}

export function isPoint(location: unknown): location is Point {
  return (
    !!location &&
    typeof location === "object" &&
    "offset" in location &&
    typeof location.offset === "number" &&
    "id" in location &&
    isBlockId(location.id)
  );
}

export function isRange(location: unknown): location is Range {
  return (
    !!location &&
    typeof location === "object" &&
    "anchor" in location &&
    isPoint(location.anchor) &&
    "head" in location &&
    isPoint(location.head)
  );
}

export function isLocation(location: unknown): location is Location {
  return isBlockId(location) || isPoint(location) || isRange(location);
}
