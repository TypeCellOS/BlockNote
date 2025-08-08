import { DOMParser, Fragment, Schema } from "prosemirror-model";

/**
 * This function is used to parse the content of a list item external HTML
 * node. Because the HTML spec supports having block-level elements in `li`
 * elements, but BlockNote only supports inline content within list items, we
 * merge the inline content from all elements within the `li` element.
 *
 * Ideally, we would instead parse any block-level elements within the `li` as
 * nested blocks of the list item. In fact, this is what we were previously
 * doing, see:
 * https://github.com/TypeCellOS/BlockNote/pull/1661
 *
 * However, this solution failed edge cases, namely when multiple `li` elements
 * with multiple block-level elements would be consecutively parsed. An example
 * case of this can be found here:
 * `tests/src/unit/core/formatConversion/parse/multipleQuoteListItems.json`
 *
 * It turns out that fixing these edge cases requires a different approach, and
 * a detailed write-up regarding this can be found here:
 * https://linear.app/blocknote/issue/ee0c4bde-341f-4773-8694-336e65e4a686
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
): Fragment {
  const parser = DOMParser.fromSchema(schema);

  // TODO: This will be unnecessary in the future:
  // https://github.com/ProseMirror/prosemirror-model/commit/166188d4f9db96eb86fb7de62e72049c86c9dd79
  const node = _node as HTMLElement;

  // Move the `li` element's content into a new `div` element. This is a hacky
  // workaround to not re-trigger list item parsing, when we are looking to
  // understand what the list item's content actually is, in terms of the
  // schema.
  const clonedNodeDiv = document.createElement("div");
  // Mark the `div` element as a `blockGroup` to make the parsing easier.
  clonedNodeDiv.setAttribute("data-node-type", "blockGroup");
  // Clone all children of the `li` element into the new `div` element
  for (const child of Array.from(node.childNodes)) {
    clonedNodeDiv.appendChild(child.cloneNode(true));
  }

  // Parses children of the `li` element into a `blockGroup` with
  // `blockContainer` node children.
  const blockGroupNode = parser.parse(clonedNodeDiv, {
    topNode: schema.nodes.blockGroup.create(),
  });

  // Merges the inline content of all `blockContainer` nodes parsed.
  let listItemMergedContent = Fragment.from(
    blockGroupNode.firstChild?.firstChild?.content,
  );
  for (let i = 1; i < blockGroupNode.childCount; i++) {
    listItemMergedContent = listItemMergedContent
      .append(Fragment.from(schema.nodes["hardBreak"].create()))
      .append(blockGroupNode.child(i).firstChild!.content);
  }

  return listItemMergedContent;
}
