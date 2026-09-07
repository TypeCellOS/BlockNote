import { NodeView, ViewMutationRecord } from "@tiptap/pm/view";

// Dark Reader recolours a page by rewriting inline styles (every declaration
// it adds starts with `--darkreader`) and stamping `data-darkreader-*`
// attributes on the elements it touched. ProseMirror re-reads a node view on
// any DOM mutation inside it and re-renders it, after which the extension
// rewrites it again: an endless loop that froze the tab on code blocks and
// toggles (#2818). Only those writes are ignored. Every other mutation must
// reach ProseMirror, including a browser's native paragraph split, which lands
// next to the content DOM on Android and iOS: ignoring it left the split
// unread and a stray paragraph in the block (#3001).
export function isDarkReaderMutation(mutation: ViewMutationRecord): boolean {
  if (mutation.type !== "attributes" || !mutation.attributeName) {
    return false;
  }
  if (mutation.attributeName.startsWith("data-darkreader")) {
    return true;
  }
  if (mutation.attributeName !== "style") {
    return false;
  }
  const style = (mutation.target as Element).getAttribute("style") ?? "";
  return (
    style.includes("--darkreader") ||
    (mutation.oldValue ?? "").includes("--darkreader")
  );
}

export function ignoreDarkReaderMutations(nodeView: NodeView): void {
  const originalIgnoreMutation = nodeView.ignoreMutation?.bind(nodeView);

  nodeView.ignoreMutation = (mutation: ViewMutationRecord) => {
    if (isDarkReaderMutation(mutation)) {
      return true;
    }

    // Defer to the node view's own `ignoreMutation` for additional filtering.
    return originalIgnoreMutation ? originalIgnoreMutation(mutation) : false;
  };
}
