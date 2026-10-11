import type { EditorView } from "prosemirror-view";

// FIXME: this file finds blocks through their rendered DOM (selectors,
// `closest`). Resolving through ProseMirror instead would drop the selectors:
// `view.posAtDOM` for the block an element is in, the document for a block's
// children, and `view.nodeDOM` for their boxes. Check `posAtDOM` inside node
// views and nested editors first. The same applies to
// `getDraggableBlockFromElement`.

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
  // Embedded editors own their blocks, even though their DOM is inside ours.
  if (element.closest(".bn-editor") !== view.dom) {
    return undefined;
  }
  const block = element.closest(BLOCK_SELECTOR);
  return block && block !== view.dom && view.dom.contains(block)
    ? block
    : undefined;
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
