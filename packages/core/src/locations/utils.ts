import { BlockId, BlockIdentifier, Location, Point, Range } from "./types.js";

/**
 * Converts a block identifier to a block id.
 */
export function toId(id: BlockIdentifier): BlockId {
  return typeof id === "string" ? id : id.id;
}

/**
 * Checks if a location is a block id.
 */
export function isBlockId(id: unknown): id is BlockId {
  return typeof id === "string";
}

/**
 * Checks if a location is a block identifier.
 */
export function isBlockIdentifier(id: unknown): id is BlockIdentifier {
  return !!id && typeof id === "object" && "id" in id && !("offset" in id);
}

/**
 * Checks if a location is a point.
 */
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

/**
 * Checks if a location is a range.
 */
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

/**
 * Checks if a location is valid.
 */
export function isLocation(location: unknown): location is Location {
  return (
    isBlockId(location) ||
    isBlockIdentifier(location) ||
    isPoint(location) ||
    isRange(location)
  );
}

/**
 * Gets the block range from a location.
 */
export function getBlockRange(location: Location): [BlockId, BlockId] {
  if (isBlockId(location)) {
    return [location, location];
  }

  if (isBlockIdentifier(location)) {
    return [location.id, location.id];
  }

  if (isPoint(location)) {
    return [location.id, location.id];
  }

  if (isRange(location)) {
    return [location.anchor.id, location.head.id];
  }

  throw new Error("Invalid location", { cause: { location } });
}

/**
 * Checks if a location is pointing to a block.
 */
export function isPointingToBlock(location: Location): boolean {
  if (isBlockId(location)) {
    return true;
  }

  if (isBlockIdentifier(location)) {
    return true;
  }

  if (isPoint(location)) {
    return location.offset === -1;
  }

  if (isRange(location)) {
    return (
      location.anchor.offset === -1 &&
      location.head.offset === -1 &&
      location.anchor.id === location.head.id
    );
  }

  throw new Error("Invalid location", { cause: { location } });
}

/**
 * Upcasts a location into a range (since all locations can be represented as a range)
 */
export function normalizeToRange(location: Location): Range {
  if (isBlockId(location)) {
    // Just make blockIds into a point
    location = {
      id: location,
      offset: -1,
    };
  }

  if (isBlockIdentifier(location)) {
    // Just make blockIdentifiers into a point
    location = {
      id: location.id,
      offset: -1,
    };
  }

  if (isPoint(location)) {
    return {
      anchor: location,
      head: location,
    };
  }

  if (isRange(location)) {
    return location;
  }

  throw new Error("Invalid location type", { cause: { location } });
}

/**
 * Checks if two locations are actually the same location.
 */
export function isLocationEqual(
  location1: Location,
  location2: Location,
): boolean {
  const range1 = normalizeToRange(location1);
  const range2 = normalizeToRange(location2);
  return (
    range1.anchor.id === range2.anchor.id &&
    range1.anchor.offset === range2.anchor.offset &&
    range1.head.id === range2.head.id &&
    range1.head.offset === range2.head.offset
  );
}

/**
 * Gets the block id from a location.
 * @throws if the location is not a single block.
 */
export function getBlockId(location: Location): BlockId {
  const range = normalizeToRange(location);
  if (range.anchor.id !== range.head.id) {
    throw new Error("Invalid location, must be a single block", {
      cause: { location },
    });
  }
  return range.anchor.id;
}
