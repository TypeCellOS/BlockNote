export function elementOverflow(element: HTMLElement, container: HTMLElement) {
  const elementRect = element.getBoundingClientRect();
  const parentRect = container.getBoundingClientRect();

  const topOverflow = elementRect.top < parentRect.top;
  const bottomOverflow = elementRect.bottom > parentRect.bottom;
  const leftOverflow = elementRect.left < parentRect.left;
  const rightOverflow = elementRect.right > parentRect.right;

  const horizontalOverflow =
    leftOverflow && rightOverflow
      ? "both"
      : leftOverflow
        ? "left"
        : rightOverflow
          ? "right"
          : "none";

  return topOverflow && bottomOverflow
    ? "both"
    : topOverflow
      ? "top"
      : bottomOverflow
        ? "bottom"
        : horizontalOverflow;
}
