import { EditorView } from "prosemirror-view";

const EMPTY_SET: ReadonlySet<string> = new Set();

/**
 * Walks up from `element` to the closest element that can host a side-menu
 * drag handle. Both sets are derived from each spec's `meta.draggable` (see
 * `getContainerUIInfo`); a block that opts out is skipped, so the handle falls
 * through to the nearest draggable ancestor rather than disappearing.
 */
export function getDraggableBlockFromElement(
  element: Element,
  // Only `dom` is read — the stop condition for the upward walk.
  view: Pick<EditorView, "dom">,
  types: {
    draggableContainerTypes?: ReadonlySet<string>;
    nonDraggableBlockTypes?: ReadonlySet<string>;
  } = {},
) {
  const draggableContainerTypes = types.draggableContainerTypes ?? EMPTY_SET;
  const nonDraggableBlockTypes = types.nonDraggableBlockTypes ?? EMPTY_SET;

  const isDraggable = (el: Element) => {
    const nodeType = el.getAttribute?.("data-node-type");

    if (nodeType === "blockContainer") {
      if (nonDraggableBlockTypes.size === 0) {
        return true;
      }
      // Every regular block shares the `blockContainer` node, so its actual
      // block type only shows up on its content element. That element comes
      // before any nested `blockGroup`, so the first match in document order
      // is this block's own content rather than a descendant's.
      const contentType = el
        .querySelector("[data-content-type]")
        ?.getAttribute("data-content-type");

      return !contentType || !nonDraggableBlockTypes.has(contentType);
    }

    return (
      nodeType !== null &&
      nodeType !== undefined &&
      draggableContainerTypes.has(nodeType)
    );
  };

  while (
    element &&
    element.parentElement &&
    element.parentElement !== view.dom &&
    !isDraggable(element)
  ) {
    element = element.parentElement;
  }
  if (!isDraggable(element)) {
    return undefined;
  }
  return { node: element as HTMLElement, id: element.getAttribute("data-id")! };
}
