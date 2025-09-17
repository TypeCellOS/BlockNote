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

    const { backgroundColor } = parseDefaultProps(element);

    return {
      ...parseEmbedElement(element as HTMLEmbedElement),
      backgroundColor,
    };
  }

  if (element.tagName === "FIGURE") {
    const parsedFigure = parseFigureElement(element, "embed");
    if (!parsedFigure) {
      return undefined;
    }

    const { targetElement, caption } = parsedFigure;

    const { backgroundColor } = parseDefaultProps(element);

    return {
      ...parseEmbedElement(targetElement as HTMLEmbedElement),
      backgroundColor,
      caption,
    };
  }

  return undefined;
};

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
});
