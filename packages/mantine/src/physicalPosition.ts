import { type ComponentProps } from "@blocknote/react";

type Position = ComponentProps["Generic"]["Menu"]["Root"]["position"];

const mirrored: Partial<Record<NonNullable<Position>, Position>> = {
  left: "right",
  "left-start": "right-start",
  "left-end": "right-end",
  right: "left",
  "right-start": "left-start",
  "right-end": "left-end",
};

/** BlockNote's adapter positions are physical. Mantine mirrors lateral
 * positions under DirectionProvider, so translate at this boundary, once. */
export function physicalPosition(
  direction: "ltr" | "rtl",
  position: Position,
): Position {
  return direction === "rtl" && position
    ? (mirrored[position] ?? position)
    : position;
}
