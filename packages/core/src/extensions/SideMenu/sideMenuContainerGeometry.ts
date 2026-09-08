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

export function rectsOverlapVertically(rects: BlockRect[]): boolean {
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      if (rects[i].top < rects[j].bottom && rects[j].top < rects[i].bottom) {
        return true;
      }
    }
  }
  return false;
}

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

export function hasVerticallyOverlappingChildren(container: Element): boolean {
  return rectsOverlapVertically(
    getDirectChildBlocks(container).map((child) =>
      child.getBoundingClientRect(),
    ),
  );
}

export function hasAncestorWithOverlappingChildren(element: Element): boolean {
  let container = element.closest(CONTAINER_SELECTOR);
  while (container) {
    if (hasVerticallyOverlappingChildren(container)) {
      return true;
    }
    container = container.parentElement?.closest(CONTAINER_SELECTOR) ?? null;
  }
  return false;
}

export function getContainerChildAtCursor(
  element: Element,
  mousePos: { x: number; y: number },
): Element | undefined {
  if (!element.matches(CONTAINER_SELECTOR)) {
    return undefined;
  }

  const children = getDirectChildBlocks(element);
  const index = rectIndexAtCursor(
    children.map((child) => child.getBoundingClientRect()),
    mousePos,
  );
  return index === undefined ? undefined : children[index];
}
