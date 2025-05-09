import { DOMParser, Fragment, Schema } from "prosemirror-model";

/**
 * This function is used to parse the content of a list item external HTML node.
 *
 * Due to a change in how prosemirror-model handles parsing elements, we have additional flexibility in how we can "fit" content into a list item.
 *
 * We've decided to take an approach that is similar to Notion. The core rules of the algorithm are:
 *
 *  - If the first child of an `li` has ONLY text content, take the text content, and flatten it into the list item. Subsequent siblings are carried over as is, as children of the list item.
 *    - e.g. `<li><h1>Hello</h1><p>World</p></li> -> <li>Hello<blockGroup><blockContainer><p>World</p></blockContainer></blockGroup></li>`
 *  - Else, take the content and insert it as children instead.
 *    - e.g. `<li><img src="url" /></li> -> <li><p></p><blockGroup><blockContainer><img src="url" /></blockContainer></blockGroup></li>`
 *
 * This ensures that a list item's content is always valid ProseMirror content. Smoothing over differences between how external HTML may be rendered, and how ProseMirror expects content to be structured.
 */
export function getListItemContent(
  /**
   * The `li` element to parse.
   */
  node: Node,
  /**
   * The schema to use for parsing.
   */
  schema: Schema,
  /**
   * The name of the list item node.
   */
  name: string
): Fragment {
  const parser = DOMParser.fromSchema(schema);

  if (!(node instanceof HTMLElement)) {
    // TODO: This will be unnecessary in the future: https://github.com/ProseMirror/prosemirror-model/commit/166188d4f9db96eb86fb7de62e72049c86c9dd79
    throw new Error("Node is not an HTMLElement");
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
