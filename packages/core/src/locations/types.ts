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
  /**
   * The number of characters from the start of the block.
   */
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
 * A block range is a pair of block identifiers, it is used to identify a range of blocks within a document.
 */
export type BlockRange = [BlockIdentifier, BlockIdentifier];

/**
 * A location is a path, point, or range, it is used to identify positions within a document.
 */
export type Location = BlockIdentifier | Point | Range;
