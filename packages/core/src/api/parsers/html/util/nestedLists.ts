function getChildIndex(node: Element) {
  return Array.prototype.indexOf.call(node.parentElement!.childNodes, node);
}

function isWhitespaceNode(node: Node) {
  return node.nodeType === 3 && !/\S/.test(node.nodeValue || "");
}

/**
 * Step 1, Turns:
 *
 * <ul>
 *  <li>item</li>
 *  <li>
 *   <ul>
 *      <li>...</li>
 *      <li>...</li>
 *   </ul>
 * </li>
 *
 * Into:
 * <ul>
 *  <li>item</li>
 *  <ul>
 *      <li>...</li>
 *      <li>...</li>
 *  </ul>
 * </ul>
 *
 */
function liftNestedListsToParent(element: HTMLElement) {
  element.querySelectorAll("li > ul, li > ol").forEach((list) => {
    const parentListItem = list.parentElement!;
    // An earlier list of the same list item moved this list out already
    // (see below).
    if (parentListItem.tagName !== "LI") {
      return;
    }
    const index = getChildIndex(list);
    const siblingsAfter = Array.from(parentListItem.childNodes).slice(
      index + 1,
    );
    list.remove();
    siblingsAfter.forEach((sibling) => {
      sibling.remove();
    });

    parentListItem.insertAdjacentElement("afterend", list);

    // The content after the nested list is also a child of the list item,
    // after the nested list (`createGroups` puts it in the block group of
    // the list item). Text and inline elements go into a paragraph.
    let last: Element = list;
    for (const block of asBlocks(siblingsAfter)) {
      last.insertAdjacentElement("afterend", block);
      last = block;
    }
    if (parentListItem.childNodes.length === 0) {
      parentListItem.remove();
    }
  });
}

/** Elements that are blocks. Other nodes are inline content. */
const BLOCK_TAGS = new Set([
  "P",
  "DIV",
  "UL",
  "OL",
  "LI",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "BLOCKQUOTE",
  "PRE",
  "TABLE",
  "FIGURE",
  "HR",
  "DETAILS",
]);

/**
 * The nodes as block elements: a block element stays, and each run of
 * inline nodes (text, links, emphasis) goes into a new paragraph. Runs of
 * whitespace only are dropped.
 */
function asBlocks(nodes: Node[]): Element[] {
  const blocks: Element[] = [];
  let paragraph: HTMLParagraphElement | undefined;
  for (const node of nodes) {
    if (node.nodeType === 1 && BLOCK_TAGS.has((node as Element).tagName)) {
      blocks.push(node as Element);
      paragraph = undefined;
    } else if (paragraph !== undefined || !isWhitespaceNode(node)) {
      if (paragraph === undefined) {
        paragraph = node.ownerDocument!.createElement("p");
        blocks.push(paragraph);
      }
      paragraph.append(node);
    }
  }
  return blocks;
}

/**
 * Step 2, Turns (output of liftNestedListsToParent):
 *
 * <li>item</li>
 * <ul>
 *   <li>...</li>
 *   <li>...</li>
 * </ul>
 *
 * Into:
 * <div>
 *  <li>item</li>
 *  <div data-node-type="blockGroup">
 *      <ul>
 *          <li>...</li>
 *          <li>...</li>
 *      </ul>
 *  </div>
 * </div>
 *
 * This resulting format is parsed
 */
function createGroups(element: HTMLElement) {
  element.querySelectorAll("li + ul, li + ol").forEach((list) => {
    const listItem = list.previousElementSibling as HTMLElement;
    const blockContainer = document.createElement("div");

    listItem.insertAdjacentElement("afterend", blockContainer);
    blockContainer.append(listItem);

    const blockGroup = document.createElement("div");
    blockGroup.setAttribute("data-node-type", "blockGroup");
    blockContainer.append(blockGroup);

    // The nested lists, and the blocks after them that
    // `liftNestedListsToParent` moved out of the list item.
    while (
      blockContainer.nextElementSibling !== null &&
      blockContainer.nextElementSibling.nodeName !== "LI"
    ) {
      blockGroup.append(blockContainer.nextElementSibling);
    }
  });
}

// prevent XSS, similar to https://github.com/ProseMirror/prosemirror-view/blob/1251b2b412656a2a06263e4187574beb43651273/src/clipboard.ts#L204
// https://github.com/TypeCellOS/BlockNote/issues/601
let _detachedDoc: Document | null = null;
function detachedDoc() {
  return (
    _detachedDoc ||
    (_detachedDoc = document.implementation.createHTMLDocument("title"))
  );
}

export function nestedListsToBlockNoteStructure(
  elementOrHTML: HTMLElement | string,
) {
  if (typeof elementOrHTML === "string") {
    const element = detachedDoc().createElement("div");
    element.innerHTML = elementOrHTML;
    elementOrHTML = element;
  }
  liftNestedListsToParent(elementOrHTML);
  createGroups(elementOrHTML);
  return elementOrHTML;
}
