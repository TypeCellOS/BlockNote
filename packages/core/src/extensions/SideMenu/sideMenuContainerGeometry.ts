import type { ContainerUIInfo } from "../../api/blockManipulation/containers/containerUI.js";

function containerChildSelector(containerUIInfo: ContainerUIInfo): string {
  return containerUIInfo.containerSelector
    ? `[data-node-type="blockContainer"],${containerUIInfo.containerSelector}`
    : `[data-node-type="blockContainer"]`;
}

export function getDirectChildBlocks(
  container: Element,
  containerUIInfo: ContainerUIInfo,
): Element[] {
  const childSelector = containerChildSelector(containerUIInfo);

  const children: Element[] = [];
  for (const child of container.querySelectorAll(childSelector)) {
    if (child.parentElement?.closest(childSelector) === container) {
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

export function rectsAreSideBySide(rects: BlockRect[]): boolean {
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

export function isHorizontalContainer(
  container: Element,
  containerUIInfo: ContainerUIInfo,
): boolean {
  return rectsAreSideBySide(
    getDirectChildBlocks(container, containerUIInfo).map((child) =>
      child.getBoundingClientRect(),
    ),
  );
}

export function hasHorizontalContainerAncestor(
  element: Element,
  containerUIInfo: ContainerUIInfo,
): boolean {
  if (!containerUIInfo.containerSelector) {
    return false;
  }
  let container = element.closest(containerUIInfo.containerSelector);
  while (container) {
    if (isHorizontalContainer(container, containerUIInfo)) {
      return true;
    }
    container =
      container.parentElement?.closest(containerUIInfo.containerSelector) ??
      null;
  }
  return false;
}

export function getContainerChildAtCursor(
  element: Element,
  mousePos: { x: number; y: number },
  containerUIInfo: ContainerUIInfo,
): Element | undefined {
  const nodeType = element.getAttribute("data-node-type");
  if (!nodeType || !containerUIInfo.containerTypes.has(nodeType)) {
    return undefined;
  }

  const children = getDirectChildBlocks(element, containerUIInfo);
  const index = rectIndexAtCursor(
    children.map((child) => child.getBoundingClientRect()),
    mousePos,
  );
  return index === undefined ? undefined : children[index];
}
