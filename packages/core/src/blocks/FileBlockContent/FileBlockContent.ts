import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import {
  BlockFromConfig,
  FileBlockConfig,
  PropSchema,
  createBlockSpec,
} from "../../schema/index.js";
import { defaultProps } from "../defaultProps.js";
import {
  createDefaultFilePreview,
  createFileAndCaptionWrapper,
  createFileBlockWrapper,
  createLinkWithCaption,
  parseEmbedElement,
  parseFigureElement,
} from "./fileBlockHelpers.js";

export const filePropSchema = {
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
} satisfies PropSchema;

export const fileBlockConfig = {
  type: "file" as const,
  propSchema: filePropSchema,
  content: "none",
  isFileBlock: true,
} satisfies FileBlockConfig;

export const fileRender = (
  block: BlockFromConfig<typeof fileBlockConfig, any, any>,
  editor: BlockNoteEditor<any, any, any>
) => {
  const file = createDefaultFilePreview(block).dom;
  const element = createFileAndCaptionWrapper(block, file);

  return createFileBlockWrapper(block, editor, element);
};

export const fileParse = (element: HTMLElement) => {
  if (element.tagName === "EMBED") {
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
};

export const fileToExternalHTML = (
  block: BlockFromConfig<typeof fileBlockConfig, any, any>
) => {
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
};

export const FileBlock = createBlockSpec(fileBlockConfig, {
  render: fileRender,
  parse: fileParse,
  toExternalHTML: fileToExternalHTML,
});
