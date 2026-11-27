import { parseFigureElement } from "./parseFigureElement.js";

/**
 * Reads the figure that `createLinkWithCaption` writes: a link to the file,
 * then a caption, each with only text in it, and no other content. Each other
 * figure gives `undefined`. A figure without a caption is one of these: the
 * export without a caption is a link in a paragraph, which is not a file
 * block.
 */
export function parseLinkFigure(figure: HTMLElement) {
  const parsedFigure = parseFigureElement(figure, "a");
  const url = parsedFigure?.targetElement.getAttribute("href");
  if (
    !parsedFigure?.caption ||
    !url ||
    figure.children.length !== 2 ||
    figure.lastElementChild?.tagName !== "FIGCAPTION" ||
    // An element in the link or in the caption.
    figure.querySelector(":scope > * > *") ||
    // Text next to them. White space and comments do not count.
    Array.from(figure.childNodes).some(
      (node) =>
        node.nodeType === 3 /* Node.TEXT_NODE */ && node.textContent?.trim(),
    )
  ) {
    return undefined;
  }

  // The export writes the URL as the link text of a block without a name.
  const name = parsedFigure.targetElement.textContent.trim();

  return {
    url,
    name: name === url ? "" : name,
    caption: parsedFigure.caption,
  };
}
