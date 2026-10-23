/** One sibling in either a ProseMirror document or serialized block DOM. */
export type ListSibling<T> = {
  item: T;
  type: string | undefined;
  start: unknown;
  listItem: boolean;
};

/** Shared numbering and same-type list boundaries for views and full HTML. */
export function walkListSiblings<T>(
  siblings: Iterable<ListSibling<T>>,
  onIndex: (
    item: T,
    index: number,
    isFirst: boolean,
    hasStart: boolean,
  ) => void,
  onList: (items: T[]) => void,
) {
  let previousIndex: number | undefined;
  let run: { type: string; items: T[] } | undefined;

  function finishRun() {
    if (run) {
      onList(run.items);
      run = undefined;
    }
  }

  for (const { item, type, start, listItem } of siblings) {
    if (type === "numberedListItem") {
      const isFirst = previousIndex === undefined;
      const index: number =
        previousIndex === undefined
          ? typeof start === "number" && start
            ? start
            : 1
          : previousIndex + 1;
      previousIndex = index;
      onIndex(item, index, isFirst, !!start);
    } else {
      previousIndex = undefined;
    }

    if (type && listItem) {
      if (run && run.type !== type) {
        finishRun();
      }
      (run ??= { type, items: [] }).items.push(item);
    } else {
      finishRun();
    }
  }
  finishRun();
}

/** A visually hidden owner whose items remain in their original DOM. */
export function createListOwner(doc: Document, ids: string[]) {
  const owner = doc.createElement("div");
  owner.setAttribute("data-bn-list-owner", "");
  owner.setAttribute("role", "list");
  owner.setAttribute("aria-owns", ids.join(" "));
  // Keep it in the accessibility tree without affecting layout.
  owner.style.cssText =
    "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0";
  return owner;
}
