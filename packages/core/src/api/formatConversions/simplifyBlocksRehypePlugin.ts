import { Element as HASTElement, Parent as HASTParent } from "hast";
import { fromDom } from "hast-util-from-dom";

type SimplifyBlocksOptions = {
  orderedListItemBlockTypes: Set<string>;
  unorderedListItemBlockTypes: Set<string>;
};

/**
 * Rehype plugin which converts the HTML output string rendered by BlockNote into a simplified structure which better
 * follows HTML standards. It does several things:
 * - Removes all block related div elements, leaving only the actual content inside the block.
 * - Lifts nested blocks to a higher level for all block types that don't represent list items.
 * - Wraps blocks which represent list items in corresponding ul/ol HTML elements and restructures them to comply
 * with HTML list structure.
 * @param options Options for specifying which block types represent ordered and unordered list items.
 */
export function simplifyBlocks(options: SimplifyBlocksOptions) {
  const listItemBlockTypes = new Set<string>([
    ...options.orderedListItemBlockTypes,
    ...options.unorderedListItemBlockTypes,
  ]);

  const simplifyBlocksHelper = (tree: HASTParent) => {
    // Checks whether blocks in the tree are wrapped by a parent `blockGroup`
    // element, in which case the `blockGroup`'s children are lifted out, and it
    // is removed.
    if (
      tree.children.length === 1 &&
      (tree.children[0] as HASTElement).properties?.["dataNodeType"] ===
        "blockGroup"
    ) {
      const blockGroup = tree.children[0] as HASTElement;
      tree.children.pop();
      tree.children.push(...blockGroup.children);
    }

    let numChildElements = tree.children.length;
    let activeList: HASTElement | undefined;

    for (let i = 0; i < numChildElements; i++) {
      const blockOuter = tree.children[i] as HASTElement;
      const blockContainer = blockOuter.children[0] as HASTElement;
      const blockContent = blockContainer.children[0] as HASTElement;
      const blockGroup =
        blockContainer.children.length === 2
          ? (blockContainer.children[1] as HASTElement)
          : null;

      const isListItemBlock = listItemBlockTypes.has(
        blockContent.properties!["dataContentType"] as string
      );

      const listItemBlockType = isListItemBlock
        ? options.orderedListItemBlockTypes.has(
            blockContent.properties!["dataContentType"] as string
          )
          ? "ol"
          : "ul"
        : null;

      // Plugin runs recursively to process nested blocks.
      if (blockGroup !== null) {
        simplifyBlocksHelper(blockGroup);
      }

      // Checks that there is an active list, but the block can't be added to it as it's of a different type.
      if (activeList && activeList.tagName !== listItemBlockType) {
        // Blocks that were copied into the list are removed and the list is inserted in their place.
        tree.children.splice(
          i - activeList.children.length,
          activeList.children.length,
          activeList
        );

        // Updates the current index and number of child elements.
        const numElementsRemoved = activeList.children.length - 1;
        i -= numElementsRemoved;
        numChildElements -= numElementsRemoved;

        activeList = undefined;
      }

      // Checks if the block represents a list item.
      if (isListItemBlock) {
        // Checks if a list isn't already active. We don't have to check if the block and the list are of the same
        // type as this was already done earlier.
        if (!activeList) {
          // Creates a new list element to represent an active list.
          activeList = fromDom(
            document.createElement(listItemBlockType!)
          ) as HASTElement;
        }

        // Creates a new list item element to represent the block.
        const listItemElement = fromDom(
          document.createElement("li")
        ) as HASTElement;

        // Adds only the content inside the block to the active list.
        listItemElement.children.push(blockContent.children[0]);
        // Nested blocks have already been processed in the recursive function call, so the resulting elements are
        // also added to the active list.
        if (blockGroup !== null) {
          listItemElement.children.push(...blockGroup.children);
        }

        // Adds the list item representing the block to the active list.
        activeList.children.push(listItemElement);
      } else if (blockGroup !== null) {
        // Lifts all children out of the current block, as only list items should allow nesting.
        tree.children.splice(i + 1, 0, ...blockGroup.children);
        // Replaces the block with only the content inside it.
        tree.children[i] = blockContent.children[0];

        // Updates the current index and number of child elements.
        const numElementsAdded = blockGroup.children.length;
        i += numElementsAdded;
        numChildElements += numElementsAdded;
      } else {
        // Replaces the block with only the content inside it.
        tree.children[i] = blockContent.children[0];
      }
    }

    // Since the active list is only inserted after encountering a block which can't be added to it, there are cases
    // where it remains un-inserted after processing all blocks, which are handled here.
    if (activeList) {
      tree.children.splice(
        numChildElements - activeList.children.length,
        activeList.children.length,
        activeList
      );
    }
  };

  return simplifyBlocksHelper;
}
