import { defaultProps } from "../../blocks/defaultProps.js";
import { parseEmbedElement } from "../../blocks/FileBlockContent/helpers/parse/parseEmbedElement.js";
import { parseFigureElement } from "../../blocks/FileBlockContent/helpers/parse/parseFigureElement.js";
import { createFileBlockWrapper } from "../../blocks/FileBlockContent/helpers/render/createFileBlockWrapper.js";
import { createLinkWithCaption } from "../../blocks/FileBlockContent/helpers/toExternalHTML/createLinkWithCaption.js";
import {
  createBlockConfig,
  createBlockSpec,
} from "../../schema/blocks/playground.js";

const config = createBlockConfig(() => ({
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
  meta: {
    fileBlockAccept: ["*/*"],
  },
}));

export const definition = createBlockSpec(config).implementation(() => ({
  parse: (element) => {
    if (element.tagName === "EMBED") {
      // Ignore if parent figure has already been parsed.
      if (element.closest("figure")) {
        return undefined;
      }

      return parseEmbedElement(element as HTMLEmbedElement);
    }

    if (element.tagName === "FIGURE") {
      const parsedFigure = parseFigureElement(element, "embed");
      if (!parsedFigure) {
        return undefined;
      }

      const { targetElement, caption } = parsedFigure;

      return {
        ...parseEmbedElement(targetElement as HTMLEmbedElement),
        caption,
      };
    }

    return undefined;
  },
  render: (block, editor) => {
    return createFileBlockWrapper(block, editor);
  },
  toExternalHTML(block) {
    if (!block.props.url) {
      const div = document.createElement("p");
      div.textContent = "Add file";

      return {
        dom: div,
      };
    }

    const fileSrcLink = document.createElement("a");
    fileSrcLink.href = block.props.url;
    fileSrcLink.textContent = block.props.name || block.props.url;

    if (block.props.caption) {
      return createLinkWithCaption(fileSrcLink, block.props.caption);
    }

    return {
      dom: fileSrcLink,
    };
  },
}));
