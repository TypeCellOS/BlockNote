import type { BlockNoteEditor } from "../../../editor/BlockNoteEditor";
import { BlockFromConfig, BlockSchemaWithBlock } from "../../../schema";
import { fileBlockConfig } from "../fileBlockConfig";
import { FileBlockExtension } from "../fileBlockExtension";
import { renderWithResizeHandles } from "./utils/renderWithResizeHandles";

export const videoRender = (
  block: BlockFromConfig<typeof fileBlockConfig, any, any>,
  editor: BlockNoteEditor<
    BlockSchemaWithBlock<"file", typeof fileBlockConfig>,
    any,
    any
  >
) => {
  // Video element.
  const video = document.createElement("video");
  video.className = "bn-visual-media";
  video.src = block.props.url;
  video.controls = true;
  video.contentEditable = "false";
  video.draggable = false;
  video.width = Math.min(
    block.props.previewWidth,
    editor.domElement.firstElementChild!.clientWidth
  );

  return renderWithResizeHandles(
    block,
    editor,
    video,
    () => video.width,
    (width) => (video.width = width)
  );
};

export const videoParse = (element: HTMLElement) => {
  if (element.tagName === "FIGURE") {
    const img = element.querySelector("video");
    const caption = element.querySelector("figcaption");
    return {
      fileType: "video",
      url: img?.src || undefined,
      caption: caption?.textContent ?? undefined,
      previewWidth: img?.width || undefined,
    };
  }

  if (element.tagName === "VIDEO") {
    return {
      fileType: "video",
      url: (element as HTMLVideoElement).src || undefined,
      previewWidth: (element as HTMLVideoElement).width || undefined,
    };
  }

  return undefined;
};

export const videoToExternalHTML = (
  block: BlockFromConfig<typeof fileBlockConfig, any, any>
) => {
  const video = document.createElement("video");
  video.src = block.props.url;
  video.width = block.props.previewWidth;

  if (block.props.caption) {
    const figure = document.createElement("figure");
    const caption = document.createElement("figcaption");
    caption.textContent = block.props.caption;

    figure.appendChild(video);
    figure.appendChild(caption);

    return {
      dom: figure,
    };
  }

  return {
    dom: video,
  };
};

export const videoFileExtension: FileBlockExtension = {
  fileEndings: ["mp4", "ogg", "webm"],
  render: videoRender,
  parse: videoParse,
  toExternalHTML: videoToExternalHTML,
  buttonText: "video",
  buttonIcon: () => {
    const fileBlockVideoIcon = document.createElement("div");
    fileBlockVideoIcon.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M2 3.9934C2 3.44476 2.45531 3 2.9918 3H21.0082C21.556 3 22 3.44495 22 3.9934V20.0066C22 20.5552 21.5447 21 21.0082 21H2.9918C2.44405 21 2 20.5551 2 20.0066V3.9934ZM8 5V19H16V5H8ZM4 5V7H6V5H4ZM18 5V7H20V5H18ZM4 9V11H6V9H4ZM18 9V11H20V9H18ZM4 13V15H6V13H4ZM18 13V15H20V13H18ZM4 17V19H6V17H4ZM18 17V19H20V17H18Z"></path></svg>';
    return fileBlockVideoIcon.firstElementChild as HTMLElement;
  },
};
