import { EditorView } from "prosemirror-view";

export function getDraggableBlockFromElement(
  element: Element,
  view: EditorView,
) {
  while (
    element &&
    element.parentElement &&
    element.parentElement !== view.dom &&
    element.getAttribute?.("data-node-type") !== "blockContainer"
  ) {
    element = element.parentElement;
  }
  if (element.getAttribute?.("data-node-type") !== "blockContainer") {
    return undefined;
  }
  return { node: element as HTMLElement, id: element.getAttribute("data-id")! };
}
