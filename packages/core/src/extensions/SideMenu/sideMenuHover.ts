import { EditorView } from "@tiptap/pm/view";

import { getBlockElement, getDraggableBlockFromElement } from "../blockDOM.js";
import { getNestedBlockAtCursor } from "./blockGeometry.js";

export type Point = { x: number; y: number };

export type Rect = { left: number; top: number; right: number; bottom: number };

export type HoveredBlock = { node: HTMLElement; id: string };

/**
 * How far inside the edge of the blocks the probe point goes. A probe exactly
 * on an edge can hit the element next to it.
 */
const PROBE_INSET = 10;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/** Returns the block of this editor at a visible point, if there is one. */
function getBlockAtPoint(view: EditorView, point: Point) {
  for (const element of view.root.elementsFromPoint(point.x, point.y)) {
    // Skips UI painted over the blocks (e.g. a toolbar), and the blocks of an
    // editor nested in one of ours: looks below them.
    const block = getBlockElement(element, view);
    if (block) {
      return block;
    }
  }
  return undefined;
}

/**
 * Finds the block at the height of the pointer, when the pointer is not on
 * the content of a block (it is in padding, in an indentation or in the
 * gutter).
 *
 * The function probes once: it finds the element at a point on the same line
 * as the pointer, just inside the edge of the blocks, with
 * `elementsFromPoint`. This point is next to the pointer, so it is visible
 * when the pointer is. The probe can find a parent instead of the block on
 * the line (e.g. left of a nested block, the element is the parent). Thus the
 * function then goes down into the children of the found block, by their
 * boxes, to the deepest block at the pointer's height.
 */
function probeBlockAtHeight(
  view: EditorView,
  pointer: Point,
): Element | undefined {
  const blocks = view.dom.firstElementChild?.getBoundingClientRect();
  if (!blocks || pointer.y < blocks.top || pointer.y > blocks.bottom) {
    return undefined;
  }
  const inset = Math.min(PROBE_INSET, blocks.width / 2);
  const reference = getBlockAtPoint(view, {
    x: clamp(pointer.x, blocks.left + inset, blocks.right - inset),
    y: pointer.y,
  });
  return reference ? getNestedBlockAtCursor(reference, pointer) : undefined;
}

export type HoverResolution =
  /** The pointer is over this block (directly, or at its height). */
  | { kind: "block"; block: HoveredBlock }
  /** The pointer is over UI that belongs to this editor; keep the menu as is. */
  | { kind: "editorUI" }
  /** The pointer is not over this editor's blocks. */
  | { kind: "none" };

/**
 * Which of this editor's blocks the pointer is about, from the topmost element
 * under the pointer (the event target).
 */
export function resolveHoveredBlock(
  view: EditorView,
  target: Element | null,
  pointer: Point,
  /** Whether blocks of this type get a drag handle. */
  isDraggable: (type: string) => boolean,
  /** Whether the element is UI that belongs to this editor (a toolbar, a menu). */
  isWithinEditorUI: (element: Element) => boolean,
  /** How far left or right of the editor element the pointer still counts (px). */
  hoverMargin: number,
): HoverResolution {
  // Resolve layout before applying drag policy: columns have no handle, but
  // their children do, and their gutter still needs to resolve those children.
  function draggable(block: Element | undefined): HoverResolution {
    const resolved = block
      ? getDraggableBlockFromElement(block, view, isDraggable)
      : undefined;
    return resolved ? { kind: "block", block: resolved } : { kind: "none" };
  }

  if (target && view.dom.contains(target)) {
    // Embedded editors own their blocks, even though their DOM is inside ours.
    if (target.closest(".bn-editor") !== view.dom) {
      return { kind: "none" };
    }
    // Over a block (its content, its indentation, a container's padding):
    // the deepest block at the pointer's height. Over the editor's own
    // padding: no block is known yet, so probe for the one on the line.
    const block = getBlockElement(target, view);
    return draggable(
      block
        ? getNestedBlockAtCursor(block, pointer)
        : probeBlockAtHeight(view, pointer),
    );
  }

  if (target && isWithinEditorUI(target)) {
    // A toolbar, a menu, the side menu itself, or the editor's wrapper: the
    // block under that UI is not what the pointer is about.
    return { kind: "editorUI" };
  }

  const editorRect = view.dom.getBoundingClientRect();

  // Something else is painted over the editor (e.g. another editor in an
  // overlay).
  if (
    pointer.x >= editorRect.left &&
    pointer.x <= editorRect.right &&
    pointer.y >= editorRect.top &&
    pointer.y <= editorRect.bottom
  ) {
    return { kind: "none" };
  }

  // Beside the editor element (left or right of it, level with its blocks):
  // only within `hoverMargin`, and not over another editor. Above or below
  // it, no block is at the pointer's height. The gutter where the menu sits
  // is the editor's own padding, handled above.
  const besideEditor =
    pointer.y >= editorRect.top &&
    pointer.y <= editorRect.bottom &&
    Math.max(editorRect.left - pointer.x, pointer.x - editorRect.right) <=
      hoverMargin;
  if (besideEditor && !target?.closest(".bn-editor")) {
    return draggable(probeBlockAtHeight(view, pointer));
  }
  return { kind: "none" };
}

/**
 * How far (in px) outside the intent hull the pointer may stray. A steep exit
 * from a block's corner towards its menu otherwise starts just outside the
 * hull's thin tip.
 */
const INTENT_BUFFER = 3;

/** The z component of (a - o) × (b - o): its sign says which side of o→a b is. */
function cross(o: Point, a: Point, b: Point) {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

/** Whether a point is inside the convex polygon (vertices in either order). */
function isInConvexPolygon(point: Point, polygon: Point[]): boolean {
  let sign = 0;
  for (let i = 0; i < polygon.length; i++) {
    const side = Math.sign(
      cross(polygon[i], polygon[(i + 1) % polygon.length], point),
    );
    if (side === 0) {
      continue;
    }
    if (sign === 0) {
      sign = side;
    } else if (side !== sign) {
      return false;
    }
  }
  return true;
}

function distanceToSegment(point: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  const t =
    lengthSquared === 0
      ? 0
      : clamp(
          ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared,
          0,
          1,
        );
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

/** The distance from the point to the rect (0 when it is inside). */
export function distanceToRect(point: Point, rect: Rect): number {
  return Math.hypot(
    point.x - clamp(point.x, rect.left, rect.right),
    point.y - clamp(point.y, rect.top, rect.bottom),
  );
}

/**
 * Convex hull of a small point set, with Andrew's monotone chain algorithm
 * (https://en.wikibooks.org/wiki/Algorithm_Implementation/Geometry/Convex_hull/Monotone_chain).
 */
function convexHull(points: Point[]): Point[] {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const lower: Point[] = [];
  for (const p of sorted) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    ) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper: Point[] = [];
  for (const p of [...sorted].reverse()) {
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    ) {
      upper.pop();
    }
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/**
 * Whether the pointer is on its way from the exit point to the menu: inside
 * the "triangle" spanned by the exit point and the menu's rect (the convex
 * hull of the point and the rect's corners), or within {@link INTENT_BUFFER}
 * of it, and closer to the menu than the exit point. The latter keeps the
 * buffer around the exit point from holding on to a block the pointer leaves
 * in another direction, e.g. down onto the next block.
 *
 * Similar to Floating UI's `safePolygon`
 * (https://floating-ui.com/docs/useHover#safepolygon), with two differences:
 * the hull covers the way to the menu whatever side the menu is on, and the
 * intent ends when the pointer rests (`INTENT_TIMEOUT` in `SideMenu.ts`)
 * rather than when it slows down, as people slow down when aiming at the
 * menu's small buttons.
 */
export function isHeadingToMenu(
  pointer: Point,
  exit: Point,
  menu: Rect,
): boolean {
  if (distanceToRect(pointer, menu) >= distanceToRect(exit, menu)) {
    return false;
  }
  const hull = convexHull([
    exit,
    { x: menu.left, y: menu.top },
    { x: menu.right, y: menu.top },
    { x: menu.right, y: menu.bottom },
    { x: menu.left, y: menu.bottom },
  ]);
  if (hull.length >= 3 && isInConvexPolygon(pointer, hull)) {
    return true;
  }
  // Also covers a degenerate hull (a zero-size menu).
  return hull.some(
    (vertex, i) =>
      distanceToSegment(pointer, vertex, hull[(i + 1) % hull.length]) <=
      INTENT_BUFFER,
  );
}
