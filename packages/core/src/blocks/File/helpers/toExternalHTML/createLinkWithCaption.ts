import { createFigureWithCaption } from "./createFigureWithCaption.js";

/**
 * Puts the link to the file of a block into a block-level element. With a
 * caption, this is a figure, as for an image with a caption. Without a
 * caption, this is a paragraph. A link alone is inline content: the HTML
 * parse joins two adjacent links into one paragraph.
 */
export const createLinkWithCaption = (
  element: HTMLElement,
  caption: string,
) => {
  if (!caption) {
    const paragraph = document.createElement("p");
    paragraph.appendChild(element);

    return {
      dom: paragraph,
    };
  }

  return createFigureWithCaption(element, caption);
};
