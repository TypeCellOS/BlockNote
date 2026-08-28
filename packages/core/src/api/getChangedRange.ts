import type { Transform } from "prosemirror-transform";

/**
 * Like ProseMirror's `Transform.changedRange()`, but also accounts for
 * position-preserving steps whose `StepMap` is empty — `AttrStep` (prop-only
 * updates like a heading's `level`) and mark steps. `changedRange()` and tiptap's
 * `getChangedRanges` both miss `AttrStep`, so anything that scopes work to the
 * changed range would silently ignore prop-only updates.
 *
 * O(steps), like `changedRange()`. Returns null when nothing changed.
 */
export function getChangedRange(
  transform: Transform,
): { from: number; to: number } | null {
  const { mapping, steps } = transform;
  let from = Number.POSITIVE_INFINITY;
  let to = Number.NEGATIVE_INFINITY;

  for (let i = 0; i < mapping.maps.length; i++) {
    const map = mapping.maps[i];
    // Advance the accumulated range into this step's coordinate space.
    if (i) {
      from = map.map(from, 1);
      to = map.map(to, -1);
    }

    let hadRange = false;
    map.forEach((_oldFrom, _oldTo, newFrom, newTo) => {
      hadRange = true;
      from = Math.min(from, newFrom);
      to = Math.max(to, newTo);
    });

    if (!hadRange) {
      // Position-preserving step: recover the affected position from the step,
      // since its map has no ranges. (DocAttrStep has none and affects no nodes.)
      const step = steps[i] as { pos?: number; from?: number; to?: number };
      if (typeof step.pos === "number") {
        // AttrStep
        from = Math.min(from, step.pos);
        to = Math.max(to, step.pos + 1);
      } else if (typeof step.from === "number" && typeof step.to === "number") {
        // AddMarkStep / RemoveMarkStep
        from = Math.min(from, step.from);
        to = Math.max(to, step.to);
      }
    }
  }

  if (from === Number.POSITIVE_INFINITY) {
    return null;
  }
  return { from, to };
}
