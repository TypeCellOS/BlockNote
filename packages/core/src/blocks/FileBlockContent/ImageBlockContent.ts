import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import {
  BlockFromConfig,
  FileBlockConfig,
  PropSchema,
  Props,
  createBlockSpec,
} from "../../schema";
import { defaultProps } from "../defaultProps";
import { renderWithResizeHandles } from "./extensions/utils/renderWithResizeHandles";

import {
  createFileAndCaptionDOM,
  createFileIconAndNameDOM,
  createFilePlaceholderDOM,
  parseFigure,
  toExternalHTMLWithCaption,
} from "./fileBlockHelpers";

export const propSchema = {
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

  showPreview: {
    default: true,
  },
  // File preview width in px.
  previewWidth: {
    default: 512,
  },
} satisfies PropSchema;

export const imageBlockConfig = {
  type: "image" as const,
  propSchema,
  content: "none",
  isFileBlock: true,
} satisfies FileBlockConfig;

export const fileRender = (
  block: BlockFromConfig<typeof imageBlockConfig, any, any>,
  editor: BlockNoteEditor<any, any, any>
) => {
  // Wrapper element to set the file alignment, contains both file/file
  // upload dashboard and caption.
  const wrapper = document.createElement("div");
  wrapper.className = "bn-file-block-content-wrapper";

  // File element.

  if (block.props.url === "") {
    // TODO: pass image related things
    const placeholder = createFilePlaceholderDOM(block, editor);
    wrapper.appendChild(placeholder.dom);

    return {
      dom: wrapper,
      destroy: () => {
        placeholder?.destroy?.();
      },
    };
  } else if (!block.props.showPreview) {
    const file = createFileIconAndNameDOM(block).dom;
    const element = createFileAndCaptionDOM(block, editor, file);

    return {
      dom: element.dom,
    };
  } else {
    const image = document.createElement("img");
    image.className = "bn-visual-media";
    image.src = block.props.url;
    image.alt = block.props.caption || "BlockNote image";
    image.contentEditable = "false";
    image.draggable = false;
    image.width = Math.min(
      block.props.previewWidth,
      editor.domElement.firstElementChild!.clientWidth
    );

    const file = renderWithResizeHandles(
      block,
      editor,
      image,
      () => image.width,
      (width) => (image.width = width)
    );

    const element = createFileAndCaptionDOM(block, editor, file.dom);
    wrapper.appendChild(element.dom);

    return {
      dom: wrapper,
      destroy: file.destroy,
    };
  }
};

export const parseImage = (imageElement: HTMLImageElement) => {
  const url = imageElement.src || undefined;
  const previewWidth = imageElement.width || undefined;

  return { url, previewWidth };
};

export const imageParse = (
  element: HTMLElement
): Partial<Props<typeof imageBlockConfig.propSchema>> | undefined => {
  if (element.tagName === "IMG") {
    return parseImage(element as HTMLImageElement);
  }

  if (element.tagName === "FIGURE") {
    const parsedFigure = parseFigure(element, "img");
    if (!parsedFigure) {
      return undefined;
    }

    const { targetElement, caption } = parsedFigure;

    return {
      ...parseImage(targetElement as HTMLImageElement),
      caption,
    };
  }

  return undefined;
};

export const imageToExternalHTML = (
  block: BlockFromConfig<typeof imageBlockConfig, any, any>
) => {
  if (!block.props.url) {
    const div = document.createElement("p");
    div.innerHTML = "Add image";

    return {
      dom: div,
    };
  }

  const image = document.createElement("img");
  image.src = block.props.url;

  if (block.props.caption) {
    return toExternalHTMLWithCaption(image, block.props.caption);
  }

  return {
    dom: image,
  };
};

export const ImageBlock = createBlockSpec(imageBlockConfig, {
  render: fileRender,
  parse: imageParse,
  toExternalHTML: imageToExternalHTML,
});
