/** Table handles follow inline edges; Floating UI accepts physical sides. */
export function tableHandleSide(
  direction: "ltr" | "rtl",
  edge: "start" | "end",
): "left" | "right" {
  return (direction === "ltr") === (edge === "start") ? "left" : "right";
}
