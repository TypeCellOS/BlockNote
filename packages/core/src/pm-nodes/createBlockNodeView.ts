import type { NodeViewRendererProps } from "@tiptap/core";
import { DOMSerializer } from "@tiptap/pm/model";
import type { NodeView, ViewMutationRecord } from "@tiptap/pm/view";

export function isBlockWrapperMutation(
  mutation: ViewMutationRecord,
  dom: globalThis.Node,
  innerWrapper: globalThis.Node | undefined,
): boolean {
  // Structural wrappers belong to the node view. Their attributes are rendering;
  // document edits belong in their content or must use editor commands.
  // Rereading wrapper attributes dirties and recreates their descendants.
  // Observe all content mutations, including attributes on descendant elements
  // and native mobile paragraph splits next to the content DOM.
  return (
    mutation.type === "attributes" &&
    (mutation.target === dom || mutation.target === innerWrapper)
  );
}

/** Keep the normal schema rendering and mutation handling for block wrappers. */
export function createBlockNodeView({
  node,
  view,
}: NodeViewRendererProps): NodeView {
  const toDOM = node.type.spec.toDOM;
  if (!toDOM) {
    throw new Error(`Missing DOM renderer for ${node.type.name}`);
  }
  const { dom, contentDOM } = DOMSerializer.renderSpec(
    view.dom.ownerDocument,
    toDOM(node),
  );

  return {
    dom,
    contentDOM,
    ignoreMutation(mutation) {
      return isBlockWrapperMutation(mutation, dom, contentDOM);
    },
  };
}
