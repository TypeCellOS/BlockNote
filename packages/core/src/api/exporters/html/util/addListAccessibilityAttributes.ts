import { createListOwner } from "../../../../extensions/ListItem/createListOwner.js";

function getBlockContent(block: Element | null) {
  if (!block?.matches('[data-node-type="blockOuter"]')) {
    return undefined;
  }
  const content = block.querySelector<HTMLElement>(".bn-block-content");
  // A nested list item must not be mistaken for its parent's content.
  return content?.closest('[data-node-type="blockOuter"]') === block
    ? content
    : undefined;
}

/** Mirrors ListItemExtension for static full HTML, where plugins do not run. */
export function addListAccessibilityAttributes(
  element: HTMLElement,
  isListItem: (type: string) => boolean,
) {
  const blocks = element.querySelectorAll('[data-node-type="blockOuter"]');
  for (const block of blocks) {
    const content = getBlockContent(block);
    const type = content?.getAttribute("data-content-type");
    if (!type || !isListItem(type)) {
      continue;
    }
    const previousContent = getBlockContent(block.previousElementSibling);
    if (previousContent?.getAttribute("data-content-type") === type) {
      // This item was already handled with the preceding same-type siblings.
      continue;
    }

    const ids: string[] = [];
    let item: Element | null = block;
    while (item) {
      const itemContent = getBlockContent(item);
      if (itemContent?.getAttribute("data-content-type") !== type) {
        break;
      }
      const id = encodeURIComponent(item.getAttribute("data-id")!);
      item.setAttribute("id", id);
      item.setAttribute("role", "listitem");
      ids.push(id);
      item = item.nextElementSibling;
    }
    if (ids.length > 0) {
      block.before(createListOwner(element.ownerDocument, ids));
    }
  }
  return element;
}
