import { isAllowedUri } from "../../../../extensions/tiptap-extensions/Link/link.js";
import { detachedDoc } from "../../../../util/detachedDoc.js";

// The elements with text that split around an image.
const TEXT_BLOCKS = "p, blockquote, h1, h2, h3, h4, h5, h6";

/**
 * Moves each image out of the text that holds it. An image is a block, and
 * ProseMirror drops a block that is in the text of a block.
 *
 * A paragraph, a quote and a heading split around the image, and the parts
 * keep the attributes of the element. A table cell cannot hold a block, thus
 * a link replaces the image there, if the URL of the image can be a link.
 */
export function moveImagesOutOfText(root: HTMLElement) {
  for (const image of root.querySelectorAll("img")) {
    // BlockNote's own HTML stays as it is: custom inline content can hold an
    // image, and a block of the full HTML has only one content element.
    if (image.closest("[data-inline-content-type], [data-content-type]")) {
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
    while (image.parentElement?.closest(TEXT_BLOCKS)) {
      const parent = image.parentElement;
      const before = detachedDoc().importNode(parent, false);
      while (image.previousSibling) {
        before.prepend(image.previousSibling);
      }
      parent.before(before, image);
      // A part without text is not a block. Its other content stays.
      for (const part of [before, parent]) {
        if (!part.textContent?.trim()) {
          part.replaceWith(...part.childNodes);
        }
      }
    }
  }
}
