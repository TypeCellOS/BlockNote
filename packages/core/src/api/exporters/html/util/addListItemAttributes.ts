import {
  createListOwner,
  walkListSiblings,
} from "../../../../extensions/ListItem/listItems.js";
import { UniqueID } from "../../../../extensions/tiptap-extensions/UniqueID/UniqueID.js";

/** Mirrors ListItemExtension for static full HTML, where plugins do not run. */
export function addListItemAttributes(
  element: HTMLElement,
  isListItem: (type: string) => boolean,
) {
  let prefix: string | undefined;
  let nextId = 0;
  // A frame/layout can host siblings outside a blockGroup. Group by the actual
  // parent instead of assuming all blocks are direct blockGroup children.
  const parents = new Set(
    Array.from(
      element.querySelectorAll('[data-node-type="blockOuter"]'),
      (block) => block.parentElement!,
    ),
  );
  for (const parent of parents) {
    const siblings = Array.from(parent.children, (block) => {
      // Do not mistake a nested child's content for this block's content.
      const content = block.matches('[data-node-type="blockOuter"]')
        ? Array.from(
            block.querySelectorAll<HTMLElement>(".bn-block-content"),
          ).find(
            (content) =>
              content.closest('[data-node-type="blockOuter"]') === block,
          )
        : undefined;
      const type = content?.getAttribute("data-content-type") ?? undefined;
      const start = content?.getAttribute("data-start");
      return {
        item: { block, content },
        type,
        start: start ? Number(start) : undefined,
        listItem: !!type && isListItem(type),
      };
    });
    walkListSiblings(
      siblings,
      ({ content }, index) =>
        content!.setAttribute("data-index", String(index)),
      (items) => {
        prefix ??= `bn-list-item-${UniqueID.options.generateID()}`;
        const ids = items.map(({ block }) => {
          const id = `${prefix}-${nextId++}`;
          block.setAttribute("id", id);
          block.setAttribute("role", "listitem");
          return id;
        });
        parent.insertBefore(
          createListOwner(element.ownerDocument, ids),
          items[0].block,
        );
      },
    );
  }
  return element;
}
