import { createFigureWithCaption } from "./createFigureWithCaption.js";

/**
 * A link to the file of a block, as a block of external HTML. With a caption,
 * it is a figure with the caption in a `figcaption`: the parse reads the
 * figure back as one block (see `fileParse`). Without a caption, it is in a
 * paragraph: a link alone is inline content, and the HTML parser joins two
 * adjacent links into one paragraph.
 */
export const createLinkWithCaption = (
  element: HTMLElement,
  caption: string,
) => {
  if (caption) {
    return createFigureWithCaption(element, caption);
  }
  const paragraph = document.createElement("p");
  paragraph.appendChild(element);
  return { dom: paragraph };
};
