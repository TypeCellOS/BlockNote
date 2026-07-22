import { NodeView, ViewMutationRecord } from "@tiptap/pm/view";

// Ignores all mutations, except those which modify content. ProseMirror by default allows for
// bidirectional updates between state & view i.e., mutating the view can cause a state update.
// This means that basically any DOM mutation in a node view will trigger a re-render, which can
// cause issues with certain browser extensions and interactive elements which aren't linked to
// the node or editor state.
export function isNonContentMutation(
  mutation: ViewMutationRecord,
  contentDOM: HTMLElement | null | undefined,
): boolean {
  // Let ProseMirror handle selection changes.
  if (mutation.type === "selection") {
    return false;
  }

  // Ignore all mutations for nodes without content.
  if (!contentDOM) {
    return true;
  }

  // Ignore all changes to DOM attributes. If a DOM attribute value depends on the value of a
  // ProseMirror node's attribute, the change should be made to the ProseMirror node directly,
  // which will trigger a re-render. We don't propagate changes to the DOM back to the node.
  if (mutation.type === "attributes") {
    return true;
  }

  // Everything left is a `childList` or `characterData` mutation (i.e., a content mutation). Only
  // those inside the content DOM are actual content edits that ProseMirror needs to read.
  return !contentDOM.contains(mutation.target);
}

export function ignoreNonContentMutations(nodeView: NodeView): void {
  const originalIgnoreMutation = nodeView.ignoreMutation?.bind(nodeView);
  const contentDOM = nodeView.contentDOM;

  nodeView.ignoreMutation = (mutation: ViewMutationRecord) => {
    if (isNonContentMutation(mutation, contentDOM)) {
      return true;
    }

    // Defer to the node view's own `ignoreMutation` for additional filtering.
    return originalIgnoreMutation ? originalIgnoreMutation(mutation) : false;
  };
}
