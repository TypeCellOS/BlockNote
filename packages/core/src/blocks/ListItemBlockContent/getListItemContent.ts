import { DOMParser, Fragment, Schema } from "prosemirror-model";

export function getListItemContent(
  node: Node,
  schema: Schema,
  name: string
): Fragment {
  const parser = DOMParser.fromSchema(schema);

  if (!(node instanceof HTMLElement)) {
    return parser.parse(node, {
      topNode: schema.nodes[name].create(),
    }).content;
  }

  // TODO: Super hacky workaround so check list items are parsed correctly.
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];

    if (child.tagName === "INPUT" || child.tagName === "LABEL") {
      node.removeChild(child);
    }
  }

  // @nperez0111 can you explain why we can't use the original `li` element?
  const nodeCopy = document.createElement("div");
  nodeCopy.innerHTML = node.innerHTML;

  // Parses children of the `li` element into individual `blockContainer` nodes
  // within a `blockGroup` node.
  const blockGroupNode = parser.parse(nodeCopy, {
    topNode: schema.nodes.blockGroup.create(),
  });

  const firstContentNode = blockGroupNode.firstChild?.firstChild;

  if (firstContentNode?.isTextblock) {
    // If the first node is a text block, we remove it, and insert its content
    // into the `listItem` node. The remaining nodes in the `blockGroup` stay
    // there, and the `blockGroup` node is appended to the `listItem`'s
    // content. This will make ProseMirror lift the `blockGroup` node out and
    // into the parent `blockContainer` node.
    const listItemNode = schema.nodes[name].create(
      {},
      firstContentNode.content
    );
    // TODO: Get rid of the +4 here
    const remainingNodes = blockGroupNode.content.cut(
      firstContentNode.content.size + 4
    );

    if (!remainingNodes.size) {
      // If the `blockGroup` node is empty after removing the first node, we
      // can just return the `listItem` node's content.
      return listItemNode.content;
    }

    // Otherwise, return the `listItem` node's content, and the `blockGroup`
    // node appended to it.
    debugger;
    return listItemNode.content.addToEnd(blockGroupNode.copy(remainingNodes));
  } else {
    // If the first node is not a text block, we leave the `listItem` node
    // empty. We just return the `blockGroup` node. Again, ProseMirror will
    // lift it out and into the parent `blockContainer` node.
    const result = Fragment.from(blockGroupNode);
    debugger;
    return result;
  }
}
