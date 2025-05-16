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
  _node: Node,
  /**
   * The schema to use for parsing.
   */
  schema: Schema,
  /**
   * The name of the list item node.
   */
  name: string,
): Fragment {
  /**
   * To actually implement this algorithm, we need to leverage ProseMirror's "fitting" algorithm.
   * Where, if content is parsed which doesn't fit into the current node, it will be moved into the parent node.
   *
   * This allows us to parse multiple pieces of content from within the list item (even though it normally would not match the list item's schema) and "throw" the excess content into the list item's children.
   *
   * The expected return value is a `Fragment` which contains the list item's content as the first element, and the children wrapped in a blockGroup node. Like so:
   * ```
   * Fragment<[Node<Text>, Node<BlockGroup<Node<BlockContainer<any>>>>]>
   * ```
   */
  const parser = DOMParser.fromSchema(schema);

  // TODO: This will be unnecessary in the future: https://github.com/ProseMirror/prosemirror-model/commit/166188d4f9db96eb86fb7de62e72049c86c9dd79
  const node = _node as HTMLElement;

  // Move the `li` element's content into a new `div` element
  // This is a hacky workaround to not re-trigger list item parsing,
  // when we are looking to understand what the list item's content actually is, in terms of the schema.
  const clonedNodeDiv = document.createElement("div");
  // Mark the `div` element as a `blockGroup` to make the parsing easier.
  clonedNodeDiv.setAttribute("data-node-type", "blockGroup");
  // Clone all children of the `li` element into the new `div` element
  for (const child of Array.from(node.childNodes)) {
    clonedNodeDiv.appendChild(child.cloneNode(true));
  }

  // Parses children of the `li` element into a `blockGroup` with `blockContainer` node children
  // This is the structure of list item children, so parsing into this structure allows for
  // easy separation of list item content from child list item content.
  let blockGroupNode = parser.parse(clonedNodeDiv, {
    topNode: schema.nodes.blockGroup.create(),
  });

  // There is an edge case where a list item's content may contain a `<input>` element.
  // Causing it to be recognized as a `checkListItem`.
  // We want to skip this, and just parse the list item's content as is.
  if (blockGroupNode.firstChild?.firstChild?.type.name === "checkListItem") {
    // We skip the first child, by cutting it out of the `blockGroup` node.
    // and continuing with the rest of the algorithm.
    blockGroupNode = blockGroupNode.copy(
      blockGroupNode.content.cut(
        blockGroupNode.firstChild.firstChild.nodeSize + 2,
      ),
    );
  }

  // Structure above is `blockGroup<blockContainer<any>[]>`
  // We want to extract the first `blockContainer` node's content, and see if it is a text block.
  const listItemsFirstChild = blockGroupNode.firstChild?.firstChild;

  // If the first node is not a text block, then it's first child is not compatible with the list item node.
  if (!listItemsFirstChild?.isTextblock) {
    // So, we do not try inserting anything into the list item, and instead return anything we found as children for the list item.
    return Fragment.from(blockGroupNode);
  }

  // If it is a text block, then we know it only contains text content.
  // So, we extract it, and insert its content into the `listItemNode`.
  // The remaining nodes in the `blockGroup` stay in-place.
  const listItemNode = schema.nodes[name].create(
    {},
    listItemsFirstChild.content,
  );

  // We have `blockGroup<listItemsFirstChild, ...blockContainer<any>[]>`
  // We want to extract out the rest of the nodes as `<...blockContainer<any>[]>`
  const remainingListItemChildren = blockGroupNode.content.cut(
    // +2 for the `blockGroup` node's start and end markers
    listItemsFirstChild.nodeSize + 2,
  );
  const hasRemainingListItemChildren = remainingListItemChildren.size > 0;

  if (hasRemainingListItemChildren) {
    // Copy the remaining list item children back into the `blockGroup` node.
    // This will make it back into: `blockGroup<...blockContainer<any>[]>`
    const listItemsChildren = blockGroupNode.copy(remainingListItemChildren);

    // Return the `listItem` node's content, then add the parsed children after to be lifted out by ProseMirror "fitting" algorithm.
    return listItemNode.content.addToEnd(listItemsChildren);
  }

  // Otherwise, just return the `listItem` node's content.
  return listItemNode.content;
}
