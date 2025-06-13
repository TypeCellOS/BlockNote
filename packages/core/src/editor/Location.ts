import type { Block } from "../blocks/defaultBlocks.js";
import type {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../schema/index.js";

/**
 * A block id is a unique identifier for a block, it is a string.
 */
export type BlockId = string;

/**
 * A block identifier is a unique identifier for a block, it is either a string, or can be object with an id property (out of convenience).
 */
export type BlockIdentifier = { id: BlockId } | BlockId;

/**
 * A path is a list of block identifiers, describing a path to a block within a document.
 * Each level of the path is a child of the previous level.
 * The entire document can be described by the path [].
 */
export type Path = BlockIdentifier[];

/**
 * A point is a path with an offset, it is used to identify a specific position within a block.
 */
export type Point = {
  path: Path;
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
export type Location = Path | Point | Range;

export function toId(id: BlockIdentifier): BlockId {
  return typeof id === "string" ? id : id.id;
}

export function isPoint(location: unknown): location is Point {
  return (
    !!location &&
    typeof location === "object" &&
    "offset" in location &&
    typeof location.offset === "number" &&
    "path" in location &&
    isPath(location.path)
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

export function isPath(location: unknown): location is Path {
  return (
    Array.isArray(location) &&
    location.every(
      (segment) =>
        typeof segment === "string" ||
        (typeof segment === "object" && "id" in segment),
    )
  );
}

export function isLocation(location: unknown): location is Location {
  return isPath(location) || isPoint(location) || isRange(location);
}

export function getBlockAtPath<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(path: Path, document: Block<BSchema, I, S>[]): Block<BSchema, I, S>[] {
  if (!path.length) {
    return document;
  }

  let currentBlocks = document;

  for (let i = 0; i < path.length; i++) {
    const id = toId(path[i]);
    const block = currentBlocks.find((block) => block.id === id);

    if (!block) {
      return [];
    }

    if (!block.children.length) {
      // If we're at the last path segment, return just the block
      if (i === path.length - 1) {
        return [block];
      }
      // If we have more path segments but no children, path is invalid
      return [];
    }

    currentBlocks = block.children;
  }

  return currentBlocks;
}

/**
 * Can be used to get all blocks at any location
 */
export function getBlocks<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  location: Location,
  document: Block<BSchema, I, S>[],
): Block<BSchema, I, S>[] {
  if (isPath(location)) {
    return getBlockAtPath(location, document);
  }
  if (isPoint(location)) {
    return getBlockAtPath(location.path, document);
  }
  if (isRange(location)) {
    // TODO this is not actually correct, they need to get the common ancestor and then get the blocks from that point to the end of the range
    return Array.from(
      new Set([
        ...getBlocks(location.anchor.path, document),
        ...getBlocks(location.head.path, document),
      ]),
    );
  }
  throw new Error("Invalid location");
}
