import type { EditorView } from "prosemirror-view";

// UniqueID and the block renderers put data-id on every block root.
// Ordinary blocks also copy it to blockOuter, which is only rendering chrome.
export const BLOCK_SELECTOR =
  '[data-node-type][data-id]:not([data-node-type="blockOuter"])';
export const CONTAINER_SELECTOR = `${BLOCK_SELECTOR}:not([data-node-type="blockContainer"])`;

/** Resolves block identity independently of whether it gets a drag handle. */
export function getBlockFromElement(
  element: Element,
  view: Pick<EditorView, "dom">,
): { node: HTMLElement; id: string; type: string } | undefined {
  if (!view.dom.contains(element)) {
    return undefined;
  }
  const node = element.closest(BLOCK_SELECTOR);
  if (!node || node === view.dom || !view.dom.contains(node)) {
    return undefined;
  }

  // Embedded editors own their blocks, even though their DOM is inside ours.
  const owner = element.closest(".bn-editor");
  if (owner && owner !== view.dom) {
    return undefined;
  }

  const id = node.getAttribute("data-id");
  const nodeType = node.getAttribute("data-node-type");
  // The regular block's own content precedes its nested blockGroup, even
  // when a renderFrame adds chrome around it.
  const type =
    nodeType === "blockContainer"
      ? node
          .querySelector("[data-content-type]")
          ?.getAttribute("data-content-type")
      : nodeType;
  // A matched block root must expose its own identity. Validate this at the
  // DOM boundary so callers never need casts or non-null assertions.
  const HTMLElementClass = node.ownerDocument.defaultView?.HTMLElement;
  if (
    !HTMLElementClass ||
    !(node instanceof HTMLElementClass) ||
    !id ||
    !type
  ) {
    throw new Error(
      "Block root is missing its HTML element, ID, or block type.",
    );
  }
  return { node, id, type };
}

/** A block that opts out hands its drag handle to the nearest eligible ancestor. */
export function getDraggableBlockFromElement(
  element: Element,
  view: Pick<EditorView, "dom">,
  isDraggable: (type: string) => boolean,
) {
  let block = getBlockFromElement(element, view);
  while (block) {
    if (isDraggable(block.type)) {
      return block;
    }
    const parent = block.node.parentElement;
    block = parent ? getBlockFromElement(parent, view) : undefined;
  }
  return undefined;
}
