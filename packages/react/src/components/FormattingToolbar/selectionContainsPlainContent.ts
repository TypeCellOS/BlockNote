import type { Selection } from "@tiptap/pm/state";

/** Plain content supports annotations, but not formatting styles or links. */
export function selectionContainsPlainContent(selection: Selection): boolean {
  // Also handle a cursor inside plain content (e.g. in a static/mobile toolbar).
  for (let depth = selection.$from.depth; depth > 0; depth--) {
    if (selection.$from.node(depth).type.spec.content === "text*") {
      return true;
    }
  }

  let containsPlainContent = false;
  selection.content().content.descendants((node) => {
    if (node.type.spec.content === "text*") {
      containsPlainContent = true;
    }
    return !containsPlainContent;
  });
  return containsPlainContent;
}
