import { createListOwner } from "../../../../extensions/ListItem/createListOwner.js";

/** Mirrors ListItemExtension for static full HTML, where plugins do not run. */
export function addListItemAttributes(
  element: HTMLElement,
  isListItem: (type: string) => boolean,
) {
  // A frame/layout can host siblings outside a blockGroup. Group by the actual
  // parent instead of assuming all blocks are direct blockGroup children.
  const parents = new Set(
    Array.from(
      element.querySelectorAll('[data-node-type="blockOuter"]'),
      (block) => block.parentElement!,
    ),
  );
  for (const parent of parents) {
    let previousIndex: number | undefined;
    let run: { type: string; first: Element; ids: string[] } | undefined;

    function finishRun() {
      if (run) {
        parent.insertBefore(
          createListOwner(element.ownerDocument, run.ids),
          run.first,
        );
        run = undefined;
      }
    }

    // Snapshot the children because finishing a list inserts its owner.
    for (const block of Array.from(parent.children)) {
      // Do not mistake a nested child's content for this block's content.
      const content = block.matches('[data-node-type="blockOuter"]')
        ? Array.from(
            block.querySelectorAll<HTMLElement>(".bn-block-content"),
          ).find(
            (content) =>
              content.closest('[data-node-type="blockOuter"]') === block,
          )
        : undefined;
      const type = content?.getAttribute("data-content-type");

      if (content && type === "numberedListItem") {
        const index: number =
          previousIndex === undefined
            ? Number(content.getAttribute("data-start")) || 1
            : previousIndex + 1;
        content.setAttribute("data-index", String(index));
        previousIndex = index;
      } else {
        previousIndex = undefined;
      }

      if (run && run.type !== type) {
        finishRun();
      }
      if (type && isListItem(type)) {
        const id = encodeURIComponent(block.getAttribute("data-id")!);
        block.setAttribute("id", id);
        block.setAttribute("role", "listitem");
        (run ??= { type, first: block, ids: [] }).ids.push(id);
      } else {
        finishRun();
      }
    }
    finishRun();
  }
  return element;
}
