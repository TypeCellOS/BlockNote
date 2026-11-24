import { detachedDoc } from "../../../../util/detachedDoc.js";

// The elements with text that split around an image.
const TEXT_BLOCKS = "p, blockquote";

/**
 * Moves each image out of the text that holds it. An image is a block, and
 * ProseMirror drops a block that is in the text of a block.
 *
 * A paragraph and a quote split around the image, and the parts keep the
 * attributes of the element.
 */
export function moveImagesOutOfText(root: HTMLElement) {
  for (const image of root.querySelectorAll("img")) {
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
