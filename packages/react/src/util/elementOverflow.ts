export function elementOverflow(element: HTMLElement) {
  if (!element.parentElement) {
    return "none";
  }

  const elementRect = element.getBoundingClientRect();
  const parentRect = element.parentElement.getBoundingClientRect();

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
