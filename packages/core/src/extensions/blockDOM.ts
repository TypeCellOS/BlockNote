import type { EditorView } from "prosemirror-view";

// FIXME: this file finds blocks through their rendered DOM (selectors,
// `closest`). Resolving through ProseMirror instead would drop the selectors:
// `view.posAtDOM` for the block an element is in, the document for a block's
// children, and `view.nodeDOM` for their boxes. Check `posAtDOM` inside node
// views and nested editors first.

// UniqueID and the block renderers put data-id on every block root.
// Ordinary blocks also copy it to blockOuter, which is only rendering chrome.
export const BLOCK_SELECTOR =
  '[data-node-type][data-id]:not([data-node-type="blockOuter"])';

/**
 * Returns the root element of the block of this editor that the element is
 * in, if there is one.
 */
export function getBlockElement(
  element: Element,
  view: Pick<EditorView, "dom">,
): Element | undefined {
  if (!view.dom.contains(element)) {
    return undefined;
  }
  // Embedded editors own their blocks, even though their DOM is inside ours.
  const owner = element.closest(".bn-editor");
  if (owner && owner !== view.dom) {
    return undefined;
  }
  const block = element.closest(BLOCK_SELECTOR);
  return block && block !== view.dom && view.dom.contains(block)
    ? block
    : undefined;
}

/** Resolves block identity independently of whether it gets a drag handle. */
export function getBlockFromElement(
  element: Element,
  view: Pick<EditorView, "dom">,
): { node: HTMLElement; id: string; type: string } | undefined {
  const node = getBlockElement(element, view);
  if (!node) {
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

/**
 * Returns the child blocks of a block element: its nested blocks, or the
 * children of a container. The blocks of an editor nested in the block are
 * not its children: they belong to that editor.
 */
export function getDirectChildBlocks(container: Element): Element[] {
  const editor = container.closest(".bn-editor");
  const children: Element[] = [];
  for (const child of container.querySelectorAll(BLOCK_SELECTOR)) {
    if (
      child.parentElement?.closest(BLOCK_SELECTOR) === container &&
      child.closest(".bn-editor") === editor
    ) {
      children.push(child);
    }
  }
  return children;
}
