import type { BlockNoteEditor } from "../../../editor/BlockNoteEditor";
import { BlockFromConfig, BlockSchemaWithBlock } from "../../../schema";
import { fileBlockConfig } from "../fileBlockConfig";
import { FileBlockExtension } from "../fileBlockExtension";
import { renderWithResizeHandles } from "./utils/renderWithResizeHandles";

export const imageRender = (
  block: BlockFromConfig<typeof fileBlockConfig, any, any>,
  editor: BlockNoteEditor<
    BlockSchemaWithBlock<"file", typeof fileBlockConfig>,
    any,
    any
  >
) => {
  // Image element.
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

  return renderWithResizeHandles(
    block,
    editor,
    image,
    () => image.width,
    (width) => (image.width = width)
  );
};

export const imageParse = (element: HTMLElement) => {
  if (element.tagName === "FIGURE") {
    const img = element.querySelector("img");
    const caption = element.querySelector("figcaption");
    return {
      fileType: "image",
      url: img?.src || undefined,
      caption: caption?.textContent ?? img?.alt,
      previewWidth: img?.width || undefined,
    };
  }

  if (element.tagName === "IMG") {
    return {
      fileType: "image",
      url: (element as HTMLImageElement).src || undefined,
      previewWidth: (element as HTMLImageElement).width || undefined,
    };
  }

  return undefined;
};

export const imageToExternalHTML = (
  block: BlockFromConfig<typeof fileBlockConfig, any, any>
) => {
  const image = document.createElement("img");
  image.src = block.props.url;
  image.width = block.props.previewWidth;
  image.alt = block.props.caption || "BlockNote image";

  if (block.props.caption) {
    const figure = document.createElement("figure");
    const caption = document.createElement("figcaption");
    caption.textContent = block.props.caption;

    figure.appendChild(image);
    figure.appendChild(caption);

    return {
      dom: figure,
    };
  }

  return {
    dom: image,
  };
};

export const imageFileExtension: FileBlockExtension = {
  fileEndings: [
    "apng",
    "avif",
    "gif",
    "jpg",
    "jpeg",
    "jfif",
    "pjpeg",
    "pjp",
    "svg",
    "webp",
  ],
  render: imageRender,
  parse: imageParse,
  toExternalHTML: imageToExternalHTML,
  buttonText: "image",
  buttonIcon: () => {
    const fileBlockImageIcon = document.createElement("div");
    fileBlockImageIcon.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M5 11.1005L7 9.1005L12.5 14.6005L16 11.1005L19 14.1005V5H5V11.1005ZM4 3H20C20.5523 3 21 3.44772 21 4V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V4C3 3.44772 3.44772 3 4 3ZM15.5 10C14.6716 10 14 9.32843 14 8.5C14 7.67157 14.6716 7 15.5 7C16.3284 7 17 7.67157 17 8.5C17 9.32843 16.3284 10 15.5 10Z"></path></svg>';

    return fileBlockImageIcon.firstElementChild as HTMLElement;
  },
};
