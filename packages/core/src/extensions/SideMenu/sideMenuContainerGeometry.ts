import { BLOCK_SELECTOR, CONTAINER_SELECTOR } from "../blockDOM.js";

export function getDirectChildBlocks(container: Element): Element[] {
  const children: Element[] = [];
  for (const child of container.querySelectorAll(BLOCK_SELECTOR)) {
    if (child.parentElement?.closest(BLOCK_SELECTOR) === container) {
      children.push(child);
    }
  }
  return children;
}

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

// Descend through any container layout before probing regular indentation.
export function getNestedBlockAtCursor(
  element: Element,
  mousePos: { x: number; y: number },
): Element {
  while (element.matches(CONTAINER_SELECTOR)) {
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
