import { isAllowedUri } from "../../../../extensions/tiptap-extensions/Link/link.js";
import { detachedDoc } from "../../../../util/detachedDoc.js";

// The elements with text that split around an image.
const TEXT_BLOCKS = "p, blockquote, h1, h2, h3, h4, h5, h6";

// Removes the line breaks and the white space that are next to the image on
// one side: they have no meaning at the edge of a block.
function trimNextTo(image: Element, side: "previousSibling" | "nextSibling") {
  for (let node = image[side]; node; node = image[side]) {
    if (node.nodeName !== "BR") {
      // Only a text node (type 3) can have white space.
      if (node.nodeType !== 3) {
        return;
      }
      const text = node.nodeValue ?? "";
      node.nodeValue =
        side === "nextSibling" ? text.trimStart() : text.trimEnd();
      if (node.nodeValue) {
        return;
      }
    }
    node.remove();
  }
}

// Moves the nodes that are before `node` in its parent to the end of `to`.
function moveNodesBefore(node: ChildNode, to: ParentNode) {
  const from = node.parentNode;
  while (from?.firstChild && from.firstChild !== node) {
    to.append(from.firstChild);
  }
}

/**
 * Moves each image out of the text that holds it. An image is a block, and
 * ProseMirror drops a block that is in the text of a block.
 *
 * A paragraph, a quote and a heading split around the image, and the parts
 * keep the attributes of the element. A table cell cannot hold a block, thus
 * a link replaces the image there, if the URL of the image can be a link.
 */
export function moveImagesOutOfText(root: HTMLElement) {
  // The nodes of an element that are complete wait here until the end. In
  // jsdom, the time to put a node before another node grows with the number
  // of nodes before it. Thus a block that splits must be near the start.
  const complete = new Map<ParentNode, DocumentFragment>();
  for (const image of root.querySelectorAll("img")) {
    // BlockNote's own HTML stays as it is: custom inline content can hold an
    // image, and a block of the full HTML has only one content element. The
    // summary of a toggle is its text: an image cannot go out of it.
    if (
      image.closest("[data-inline-content-type], [data-content-type], summary")
    ) {
      continue;
    }
    if (image.closest("td, th")) {
      // Not each URL can be a link (for example `file:` and `data:`). Such an
      // image stays, and the parse of the cell drops it.
      if (image.src && isAllowedUri(image.src)) {
        const link = detachedDoc().createElement("a");
        link.href = image.src;
        link.textContent = image.alt || image.src;
        image.replaceWith(link);
      }
      continue;
    }
    // Splits the parent of the image until no text block holds the image: a
    // copy of the parent takes the content before the image.
    let holder: ParentNode | null = null;
    while (image.parentElement?.closest(TEXT_BLOCKS)) {
      const parent = image.parentElement;
      trimNextTo(image, "previousSibling");
      trimNextTo(image, "nextSibling");
      const before = detachedDoc().importNode(parent, false);
      moveNodesBefore(image, before);
      parent.before(before, image);
      holder = parent.parentNode;
      // A part without text is not a block. Its other content stays.
      for (const part of [before, parent]) {
        if (!part.textContent?.trim()) {
          part.replaceWith(...part.childNodes);
        }
      }
    }
    if (holder) {
      const nodes =
        complete.get(holder) ?? detachedDoc().createDocumentFragment();
      complete.set(holder, nodes);
      moveNodesBefore(image, nodes);
    }
  }
  for (const [holder, nodes] of complete) {
    holder.prepend(nodes);
  }
}
