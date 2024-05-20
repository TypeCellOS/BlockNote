import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import {
  BlockFromConfig,
  FileBlockConfig,
  PropSchema,
  createBlockSpec,
} from "../../schema";
import { defaultProps } from "../defaultProps";
import {
  createFileAndCaptionWrapper,
  createDefaultFilePreview,
  createAddFileButton,
  parseEmbedElement,
  parseFigureElement,
} from "./fileBlockHelpers";

export const filePropSchema = {
  textAlignment: defaultProps.textAlignment,
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
  // Wrapper element to set the file alignment, contains both file/file
  // upload dashboard and caption.
  const wrapper = document.createElement("div");
  wrapper.className = "bn-file-block-content-wrapper";

  if (block.props.url === "") {
    const addFileButton = createAddFileButton(block, editor);
    wrapper.appendChild(addFileButton.dom);

    return {
      dom: wrapper,
      destroy: addFileButton.destroy,
    };
  } else {
    const file = createDefaultFilePreview(block).dom;
    const element = createFileAndCaptionWrapper(block, file);
    wrapper.appendChild(element.dom);

    return {
      dom: wrapper,
    };
  }
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
    div.innerHTML = "Add file";

    return {
      dom: div,
    };
  }

  const fileSrcLink = document.createElement("a");
  fileSrcLink.href = block.props.url;
  fileSrcLink.innerText = block.props.name;

  if (block.props.caption) {
    const wrapper = document.createElement("div");
    const fileCaption = document.createElement("p");
    fileCaption.innerText = block.props.caption;
    wrapper.appendChild(fileSrcLink);
    wrapper.appendChild(fileCaption);

    return {
      dom: wrapper,
    };
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
