import { BlockId, BlockIdentifier, Location, Point, Range } from "./types.js";

export function toId(id: BlockIdentifier): BlockId {
  return typeof id === "string" ? id : id.id;
}

export function isBlockId(id: unknown): id is BlockId {
  return typeof id === "string";
}

export function isBlockIdentifier(id: unknown): id is BlockIdentifier {
  return !!id && typeof id === "object" && "id" in id;
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
