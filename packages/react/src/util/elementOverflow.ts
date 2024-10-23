// Default for `getContainer`, meant for use in suggestion menus. Traverses
// ancestors of the passed element until a suggestion menu root is found.
const defaultGetContainer = (element: HTMLElement) => {
  let container: HTMLElement = element;

  while (
    !container.classList.contains("bn-suggestion-menu") &&
    !container.classList.contains("bn-grid-suggestion-menu") &&
    container.parentElement
  ) {
    container = container.parentElement;
  }

  if (
    !container.classList.contains("bn-suggestion-menu") &&
    !container.classList.contains("bn-grid-suggestion-menu")
  ) {
    return;
  }

  return container;
};

export function elementOverflow(
  element: HTMLElement,
  getContainer?: () => HTMLElement | undefined
) {
  let container = getContainer?.();
  if (!container) {
    container = defaultGetContainer(element);
  }
  if (!container) {
    return "none";
  }

  const elementRect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  if (!containerRect) {
    return "none";
  }

  const topOverflow = elementRect.top < containerRect.top;
  const bottomOverflow = elementRect.bottom > containerRect.bottom;

  return topOverflow && bottomOverflow
    ? "both"
    : topOverflow
    ? "top"
    : bottomOverflow
    ? "bottom"
    : "none";
}
