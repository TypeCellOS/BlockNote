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
    const listItem = list.parentElement!;
    // An earlier list of the same list item moved this list out already.
    if (listItem.tagName !== "LI") {
      return;
    }
    // All the nodes after the own content of the list item are its children,
    // in order: the nested lists, and the blocks before and after them.
    // `createGroups` puts them in the block group of the list item. Text and
    // inline elements go into a paragraph.
    const nodes = Array.from(listItem.childNodes);
    const children = nodes.slice(childrenStart(nodes));
    children.forEach((child) => child.remove());
    let last: Element = listItem;
    for (const block of asBlocks(children)) {
      if (block.tagName !== "UL" && block.tagName !== "OL") {
        block.setAttribute(LIFTED_CHILD, "");
      }
      last.insertAdjacentElement("afterend", block);
      last = block;
    }
    if (listItem.childNodes.length === 0) {
      listItem.remove();
    }
  });
}

/** Marks a block that `liftNestedListsToParent` moved out of its list item. */
const LIFTED_CHILD = "data-bn-list-item-child";

/**
 * The index of the first child of a list item in its nodes. The own content
 * of the list item comes before it: the leading inline nodes, or else the
 * first block (after a check box). A nested list is not own content.
 */
function childrenStart(nodes: Node[]): number {
  let index = 0;
  while (
    index < nodes.length &&
    (isWhitespaceNode(nodes[index]) ||
      (nodes[index] as Element).tagName === "INPUT")
  ) {
    index++;
  }
  const first = nodes[index];
  if (first !== undefined && isBlockElement(first)) {
    const tag = (first as Element).tagName;
    return tag === "UL" || tag === "OL" ? index : index + 1;
  }
  while (index < nodes.length && !isBlockElement(nodes[index])) {
    index++;
  }
  return index;
}

function isBlockElement(node: Node): boolean {
  return node.nodeType === 1 && BLOCK_TAGS.has((node as Element).tagName);
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
    if (isBlockElement(node)) {
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
  element.querySelectorAll("li").forEach((listItem) => {
    if (!isListItemChild(listItem.nextElementSibling)) {
      return;
    }
    const blockContainer = document.createElement("div");

    listItem.insertAdjacentElement("afterend", blockContainer);
    blockContainer.append(listItem);

    const blockGroup = document.createElement("div");
    blockGroup.setAttribute("data-node-type", "blockGroup");
    blockContainer.append(blockGroup);

    let child = blockContainer.nextElementSibling;
    while (isListItemChild(child)) {
      child.removeAttribute(LIFTED_CHILD);
      blockGroup.append(child);
      child = blockContainer.nextElementSibling;
    }
  });
}

/** Returns true for a nested list, or a block that `liftNestedListsToParent` moved out of its list item. */
function isListItemChild(element: Element | null): element is Element {
  return (
    element !== null &&
    (element.nodeName === "UL" ||
      element.nodeName === "OL" ||
      element.hasAttribute(LIFTED_CHILD))
  );
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
