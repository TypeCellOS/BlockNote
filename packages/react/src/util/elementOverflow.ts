export function elementOverflow(element: HTMLElement, container: HTMLElement) {
  const elementRect = element.getBoundingClientRect();
  const parentRect = container.getBoundingClientRect();

  const topOverflow = elementRect.top < parentRect.top;
  const bottomOverflow = elementRect.bottom > parentRect.bottom;

  return topOverflow && bottomOverflow
    ? "both"
    : topOverflow
      ? "top"
      : bottomOverflow
        ? "bottom"
        : "none";
}
