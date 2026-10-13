import { BLOCK_SELECTOR, getDirectChildBlocks } from "../blockDOM.js";

export type BlockRect = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

// X-match wins over y-only match (disambiguates side-by-side children).
export function rectIndexAtCursor(
  rects: BlockRect[],
  mousePos: { x: number; y: number },
): number | undefined {
  let verticalMatch: number | undefined = undefined;
  for (let i = 0; i < rects.length; i++) {
    const rect = rects[i];
    if (mousePos.y < rect.top || mousePos.y > rect.bottom) {
      continue;
    }
    if (mousePos.x >= rect.left && mousePos.x <= rect.right) {
      return i;
    }
    verticalMatch = verticalMatch ?? i;
  }
  return verticalMatch;
}

/**
 * Returns the deepest block at the height of the pointer, from a block that
 * contains it: the block itself, or one of its descendants at that height.
 * The children of a block are below its own content (nested blocks) or fill
 * it (a container), so the pointer on the block's own content stays on the
 * block. The pointer in the indentation of nested blocks, or in the padding
 * of a container beside a child, goes to the child at that height.
 */
export function getNestedBlockAtCursor(
  element: Element,
  mousePos: { x: number; y: number },
): Element {
  while (element.matches(BLOCK_SELECTOR)) {
    const children = getDirectChildBlocks(element);
    const index = rectIndexAtCursor(
      children.map((child) => child.getBoundingClientRect()),
      mousePos,
    );
    if (index === undefined) {
      break;
    }
    element = children[index];
  }
  return element;
}
