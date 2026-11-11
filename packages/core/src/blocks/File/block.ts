import { createBlockConfig, createBlockSpec } from "../../schema/index.js";
import { defaultProps, parseDefaultProps } from "../defaultProps.js";
import { parseEmbedElement } from "./helpers/parse/parseEmbedElement.js";
import { parseFigureElement } from "./helpers/parse/parseFigureElement.js";
import { createFileBlockWrapper } from "./helpers/render/createFileBlockWrapper.js";
import { createLinkWithCaption } from "./helpers/toExternalHTML/createLinkWithCaption.js";

export type FileBlockConfig = ReturnType<typeof createFileBlockConfig>;

export const createFileBlockConfig = createBlockConfig(
  () =>
    ({
      type: "file" as const,
      propSchema: {
        backgroundColor: defaultProps.backgroundColor,
        // File name.
        name: {
          default: "" as const,
        },
        // File url.
        url: {
          default: "" as const,
        },
        // File caption.
        caption: {
          default: "" as const,
        },
      },
      content: "none" as const,
    }) as const,
);

export const fileParse = () => (element: HTMLElement) => {
  if (element.tagName === "EMBED") {
    // Ignore if parent figure has already been parsed.
    if (element.closest("figure")) {
      return undefined;
    }

    const embed = parseEmbedElement(element as HTMLEmbedElement);
    // A file without a source is no block: the markdown export of a file
    // block without a URL is empty, also with a caption.
    if (!embed.url) {
      return undefined;
    }

    const { backgroundColor } = parseDefaultProps(element);

    return {
      ...embed,
      backgroundColor,
    };
  }

  if (element.tagName === "FIGURE") {
    const parsedFigure = parseFigureElement(element, "embed");
    if (!parsedFigure) {
      return parseLinkFigure(element);
    }

    const { targetElement, caption } = parsedFigure;

    const embed = parseEmbedElement(targetElement as HTMLEmbedElement);
    if (!embed.url) {
      return undefined;
    }

    const { backgroundColor } = parseDefaultProps(element);

    return {
      ...embed,
      backgroundColor,
      caption,
    };
  }

  return undefined;
};

/**
 * A figure with a link to a file as a direct child, and a caption: the
 * external HTML of a block that shows its file as a link, with a caption
 * (see `createLinkWithCaption`). A figure with an image, a video, an audio
 * or an embed element is not such a figure: the parse rule of that element
 * reads it.
 *
 * A figure without a caption is not a file block: the export of a file
 * block without a caption is a link in a paragraph, and the parse reads
 * that as a paragraph. Thus, the two forms give the same block.
 */
function parseLinkFigure(figure: HTMLElement) {
  const link = figure.querySelector(":scope > a");
  const caption = figure.querySelector(":scope > figcaption")?.textContent;
  if (
    link === null ||
    !caption ||
    figure.querySelector("img, video, audio, embed") !== null
  ) {
    return undefined;
  }
  const url = link.getAttribute("href");
  if (!url) {
    return undefined;
  }
  // The export writes the URL as the text of a link without a name.
  const text = link.textContent ?? "";
  const { backgroundColor } = parseDefaultProps(figure);
  return { url, name: text === url ? "" : text, caption, backgroundColor };
}

export const createFileBlockSpec = createBlockSpec(createFileBlockConfig, {
  meta: {
    fileBlockAccept: ["*/*"],
  },
  parse: fileParse(),
  render(block, editor) {
    return createFileBlockWrapper(block, editor);
  },
  toExternalHTML(block) {
    if (!block.props.url) {
      return {
        dom: document.createElement("embed"),
      };
    }

    const fileSrcLink = document.createElement("a");
    fileSrcLink.href = block.props.url;
    fileSrcLink.textContent = block.props.name || block.props.url;

    return createLinkWithCaption(fileSrcLink, block.props.caption);
  },
});
