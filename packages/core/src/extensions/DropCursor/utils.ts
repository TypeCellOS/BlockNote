import type { EditorView } from "prosemirror-view";

/**
 * The orientation of the drop cursor.
 */
export type DropCursorOrientation =
  | "inline" // Vertical line within text
  | "block-horizontal" // Horizontal line between blocks
  | "block-vertical-left" // Vertical line on left edge of block
  | "block-vertical-right"; // Vertical line on right edge of block

/**
 * The position and orientation of the drop cursor.
 */
export type DropCursorPosition = {
  pos: number; // Document position
  orientation: DropCursorOrientation;
};
/**
 * Bounding rectangle in viewport coordinates (e.g. from getBoundingClientRect).
 */
export type Rect = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

/**
 * Returns true if the element or any ancestor has the given CSS class.
 * Used to skip drop cursor for elements marked with the exclusion class (e.g. drag handles).
 */
export function hasExclusionClassname(
  element: Element | null,
  exclude: string,
): boolean {
  if (!element || !exclude) {
    return false;
  }
  return !!element.closest(`.${exclude}`);
}

/**
 * Computes the viewport rect for a block-level drop cursor (horizontal line between blocks
 * or vertical line on left/right edge). Returns null for inline positions or when no DOM node exists.
 */
export function getBlockDropRect(
  view: EditorView,
  cursorPos: DropCursorPosition,
  width: number,
  scaleX: number,
  scaleY: number,
): Rect | null {
  const $pos = view.state.doc.resolve(cursorPos.pos);
  const isBlock = !$pos.parent.inlineContent;

  if (!isBlock || cursorPos.orientation === "inline") {
    return null;
  }

  const before = $pos.nodeBefore;

  const after = $pos.nodeAfter;

  if (!before && !after) {
    return null;
  }

  const isVertical =
    cursorPos.orientation === "block-vertical-left" ||
    cursorPos.orientation === "block-vertical-right";
  // For vertical cursors, position is at the node position, for horizontal cursors, position is at the node before position
  const nodePos = isVertical
    ? cursorPos.pos
    : cursorPos.pos - (before ? before.nodeSize : 0);

  const node = view.nodeDOM(nodePos) as HTMLElement | null;
  if (!node) {
    return null;
  }

  const nodeRect = node.getBoundingClientRect();

  if (isVertical) {
    const halfWidth = (width / 2) * scaleX;
    const left =
      cursorPos.orientation === "block-vertical-left"
        ? nodeRect.left
        : nodeRect.right;

    return {
      left: left - halfWidth,
      right: left + halfWidth,
      top: nodeRect.top,
      bottom: nodeRect.bottom,
    };
  }

  let top = before ? nodeRect.bottom : nodeRect.top;
  if (before && after) {
    top =
      (top +
        (view.nodeDOM(cursorPos.pos) as HTMLElement).getBoundingClientRect()
          .top) /
      2;
  }
  const halfHeight = (width / 2) * scaleY;

  return {
    left: nodeRect.left,
    right: nodeRect.right,
    top: top - halfHeight,
    bottom: top + halfHeight,
  };
}

/**
 * Computes the viewport rect for an inline drop cursor (vertical line within text).
 */
export function getInlineDropRect(
  view: EditorView,
  cursorPos: DropCursorPosition,
  width: number,
  scaleX: number,
): Rect {
  const coords = view.coordsAtPos(cursorPos.pos);
  const halfWidth = (width / 2) * scaleX;

  return {
    left: coords.left - halfWidth,
    right: coords.left + halfWidth,
    top: coords.top,
    bottom: coords.bottom,
  };
}

/**
 * Applies orientation-specific CSS classes to the drop cursor element so it can be
 * styled correctly (e.g. horizontal vs vertical line, inline vs block).
 */
export function applyOrientationClasses(
  el: HTMLElement,
  orientation: DropCursorOrientation,
) {
  el.classList.toggle(
    "prosemirror-dropcursor-inline",
    orientation === "inline",
  );
  el.classList.toggle(
    "prosemirror-dropcursor-block-horizontal",
    orientation === "block-horizontal",
  );
  el.classList.toggle(
    "prosemirror-dropcursor-block-vertical-left",
    orientation === "block-vertical-left",
  );
  el.classList.toggle(
    "prosemirror-dropcursor-block-vertical-right",
    orientation === "block-vertical-right",
  );
  el.classList.toggle(
    "prosemirror-dropcursor-block",
    orientation === "block-horizontal",
  );
  el.classList.toggle(
    "prosemirror-dropcursor-vertical",
    orientation === "block-vertical-left" ||
      orientation === "block-vertical-right",
  );
}

/**
 * Returns the offset of the parent element for converting viewport coordinates to
 * parent-relative coordinates. Handles document.body and static positioning.
 */
export function getParentOffsets(parent: HTMLElement | null) {
  if (
    !parent ||
    (parent === document.body && getComputedStyle(parent).position === "static")
  ) {
    return {
      parentLeft: -window.pageXOffset,
      parentTop: -window.pageYOffset,
    };
  }

  const parentRect = parent.getBoundingClientRect();
  const parentScaleX = parentRect.width / parent.offsetWidth;
  const parentScaleY = parentRect.height / parent.offsetHeight;

  return {
    parentLeft: parentRect.left - parent.scrollLeft * parentScaleX,
    parentTop: parentRect.top - parent.scrollTop * parentScaleY,
  };
}
