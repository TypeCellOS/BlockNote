import { isAllowedUri } from "../../../../extensions/tiptap-extensions/Link/link.js";
import { detachedDoc } from "../../../../util/detachedDoc.js";

// The elements with text that split around an image.
const TEXT_BLOCKS = "p, blockquote, h1, h2, h3, h4, h5, h6";
const CUSTOM_INLINE_CONTENT = "[data-inline-content-type]";

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

function hasRemainingContent(
  parent: Element,
  contentNodes: WeakMap<Element, Node>,
) {
  // Splitting moves nodes from the start of the parent. Reuse the first
  // meaningful node until it moves out, rather than scanning the whole tail
  // for every image. Trimming cannot remove a non-whitespace text node.
  const previous = contentNodes.get(parent);
  if (previous && parent.contains(previous)) {
    return true;
  }

  // NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT
  const walker = detachedDoc().createTreeWalker(parent, 1 | 4);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (
      node.nodeType === 1
        ? (node as Element).matches(CUSTOM_INLINE_CONTENT)
        : /\S/.test(node.nodeValue ?? "")
    ) {
      contentNodes.set(parent, node);
      return true;
    }
  }
  return false;
}

/** Splits enclosing text blocks and returns the image's new parent if moved. */
function liftImageOutOfText(
  image: HTMLImageElement,
  contentNodes: WeakMap<Element, Node>,
): ParentNode | null {
  let parent = image.parentElement;
  if (!parent?.closest(TEXT_BLOCKS)) {
    return null;
  }
  do {
    trimNextTo(image, "previousSibling");
    trimNextTo(image, "nextSibling");
    const before = detachedDoc().importNode(parent, false);
    moveNodesBefore(image, before);
    parent.before(before, image);
    // Custom inline content can be meaningful without text.
    if (
      !before.textContent?.trim() &&
      !before.querySelector(CUSTOM_INLINE_CONTENT)
    ) {
      before.replaceWith(...before.childNodes);
    }
    if (!hasRemainingContent(parent, contentNodes)) {
      parent.replaceWith(...parent.childNodes);
    }
    parent = image.parentElement;
  } while (parent?.closest(TEXT_BLOCKS));
  return parent;
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
  // Set aside earlier siblings until the end. This keeps splits near the
  // start of their parent, where insertions are cheaper in jsdom.
  const finishedPrefixes = new Map<ParentNode, DocumentFragment>();
  const contentNodes = new WeakMap<Element, Node>();
  for (const image of root.querySelectorAll("img")) {
    // BlockNote's own HTML stays as it is: custom inline content can hold an
    // image, and a block of the full HTML has only one content element. The
    // summary of a toggle and the caption of a figure are text: an image
    // cannot go out of them.
    if (
      image.closest(
        `${CUSTOM_INLINE_CONTENT}, [data-content-type], summary, figcaption`,
      )
    ) {
      continue;
    }
    if (image.closest("td, th")) {
      // Not each URL can be a link (for example `file:` and `data:`). Such an
      // image stays, and the parse of the cell drops it.
      const url = image.src;
      if (url && isAllowedUri(url)) {
        const link = detachedDoc().createElement("a");
        link.href = url;
        link.textContent = image.alt || url;
        image.replaceWith(link);
      }
      continue;
    }
    const holder = liftImageOutOfText(image, contentNodes);
    if (holder) {
      const nodes =
        finishedPrefixes.get(holder) ?? detachedDoc().createDocumentFragment();
      finishedPrefixes.set(holder, nodes);
      moveNodesBefore(image, nodes);
    }
  }
  for (const [holder, nodes] of finishedPrefixes) {
    holder.prepend(nodes);
  }
}
