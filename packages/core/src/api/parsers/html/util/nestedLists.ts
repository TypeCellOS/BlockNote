import { detachedDoc } from "../../../../util/detachedDoc.js";

function isElement(node: Node): node is Element {
  return node.nodeType === 1;
}

function isList(node: Node) {
  return node.nodeName === "UL" || node.nodeName === "OL";
}

// The elements that end a paragraph in the parse. These are the block elements
// of the ProseMirror DOM parser, and the elements that BlockNote parses as a
// block (the last line). The first three lines are a copy of `blockTags`, which
// prosemirror-model does not export:
// https://github.com/ProseMirror/prosemirror-model/blob/master/src/from_dom.ts
const BLOCK_ELEMENTS = [
  "address, article, aside, blockquote, body, canvas, dd, div, dl, fieldset",
  "figcaption, figure, footer, form, h1, h2, h3, h4, h5, h6, header, hgroup",
  "hr, li, noscript, ol, output, p, pre, section, table, tfoot, ul",
  "audio, details, embed, img, video",
].join(", ");

/** True for a block element, and for an element that has a block in it. */
function isBlock(node: Node) {
  return (
    isElement(node) &&
    (node.matches(BLOCK_ELEMENTS) ||
      node.querySelector(BLOCK_ELEMENTS) !== null)
  );
}

/**
 * True for text and for an element with text. These nodes give no content in
 * the parse: white space, a comment (node type 8), and an element without text
 * (for example an anchor, or the check box of a check list item).
 */
function hasContent(node: Node) {
  return node.nodeType !== 8 && /\S/.test(node.textContent || "");
}

/**
 * True for an element that the parse reads as one block with text: a
 * paragraph, a heading, a code block or a quote.
 */
function isTextBlock(node: Node) {
  return /^(P|H[1-6]|PRE|BLOCKQUOTE)$/.test(node.nodeName) && hasContent(node);
}

/**
 * Returns the index of the first child in the nodes of a list item that has a
 * nested list. The nodes before it are the own content of the list item: its
 * text and inline elements up to the first block, or else that first block, if
 * it is a block with text.
 *
 * If the first block is not a block with text (for example an image, or the
 * nested list), the nodes before the nested list stay in the list item. The
 * parse of the list item (`getListItemContent`) then finds its content.
 */
function childrenStart(nodes: Node[]) {
  const firstBlock = nodes.findIndex(isBlock);
  if (nodes.slice(0, firstBlock).some(hasContent)) {
    return firstBlock;
  }
  if (isTextBlock(nodes[firstBlock])) {
    return firstBlock + 1;
  }
  return nodes.findIndex(isList);
}

function createBlockGroup() {
  const blockGroup = detachedDoc().createElement("div");
  blockGroup.setAttribute("data-node-type", "blockGroup");
  return blockGroup;
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
 * A list item with content of its own keeps that content. All the nodes after
 * it are the children of the list item. They move out of the list item into a
 * block group, in order:
 *
 * <li>
 *   <p>item</p>
 *   <pre>...</pre>
 *   <ul>...</ul>
 *   text
 * </li>
 *
 * Into:
 * <li><p>item</p></li>
 * <div data-node-type="blockGroup">
 *   <pre>...</pre>
 *   <ul>...</ul>
 *   text
 * </div>
 *
 */
function liftNestedListsToParent(element: HTMLElement) {
  element.querySelectorAll("li > ul, li > ol").forEach((list) => {
    const parentListItem = list.parentElement!;
    // An earlier list of the same list item moved this list out already.
    if (parentListItem.nodeName !== "LI") {
      return;
    }

    const nodes = Array.from(parentListItem.childNodes);
    const start = childrenStart(nodes);
    const children = nodes.slice(start);

    if (start === 0) {
      // The list item starts with the nested list. Its nodes take its place,
      // and step 2 gives the nested list to the list item before it.
      parentListItem.replaceWith(...children);
      return;
    }

    const blockGroup = createBlockGroup();
    parentListItem.after(blockGroup);
    blockGroup.append(...children);
  });
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
 * If step 1 made a block group for the list item, that block group is used.
 *
 * This resulting format is parsed
 */
function createGroups(element: HTMLElement) {
  const firstChildren =
    'li + ul, li + ol, li + div[data-node-type="blockGroup"]';
  element.querySelectorAll(firstChildren).forEach((firstChild) => {
    const listItem = firstChild.previousElementSibling as HTMLElement;
    const blockContainer = detachedDoc().createElement("div");

    listItem.insertAdjacentElement("afterend", blockContainer);
    blockContainer.append(listItem);

    const blockGroup = isList(firstChild) ? createBlockGroup() : firstChild;
    blockContainer.append(blockGroup);

    while (
      blockContainer.nextElementSibling?.nodeName === "UL" ||
      blockContainer.nextElementSibling?.nodeName === "OL"
    ) {
      blockGroup.append(blockContainer.nextElementSibling);
    }
  });
}

export function nestedListsToBlockNoteStructure(html: string) {
  const element = detachedDoc().createElement("div");
  element.innerHTML = html;
  liftNestedListsToParent(element);
  createGroups(element);
  return element;
}
