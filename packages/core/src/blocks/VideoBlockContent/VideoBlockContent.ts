import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import {
  BlockFromConfig,
  createBlockSpec,
  FileBlockConfig,
  Props,
  PropSchema,
} from "../../schema";
import { defaultProps } from "../defaultProps";

import {
  createAddFileButton,
  createDefaultFilePreview,
  createFigureWithCaption,
  createFileAndCaptionWrapper,
  createLinkWithCaption,
  createResizeHandlesWrapper,
  parseFigureElement,
} from "../FileBlockContent/fileBlockHelpers";
import { parseVideoElement } from "./videoBlockHelpers";

export const videoPropSchema = {
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

export const videoBlockConfig = {
  type: "video" as const,
  propSchema: videoPropSchema,
  content: "none",
  isFileBlock: true,
  fileBlockAccept: ["video/*"],
} satisfies FileBlockConfig;

export const videoRender = (
  block: BlockFromConfig<typeof videoBlockConfig, any, any>,
  editor: BlockNoteEditor<any, any, any>
) => {
  const wrapper = document.createElement("div");
  wrapper.className = "bn-file-block-content-wrapper";

  if (block.props.url === "") {
    const fileBlockVideoIcon = document.createElement("div");
    fileBlockVideoIcon.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M2 3.9934C2 3.44476 2.45531 3 2.9918 3H21.0082C21.556 3 22 3.44495 22 3.9934V20.0066C22 20.5552 21.5447 21 21.0082 21H2.9918C2.44405 21 2 20.5551 2 20.0066V3.9934ZM8 5V19H16V5H8ZM4 5V7H6V5H4ZM18 5V7H20V5H18ZM4 9V11H6V9H4ZM18 9V11H20V9H18ZM4 13V15H6V13H4ZM18 13V15H20V13H18ZM4 17V19H6V17H4ZM18 17V19H20V17H18Z"></path></svg>';
    const addVideoButton = createAddFileButton(
      block,
      editor,
      editor.dictionary.file_blocks.video.add_button_text,
      fileBlockVideoIcon.firstElementChild as HTMLElement
    );
    wrapper.appendChild(addVideoButton.dom);

    return {
      dom: wrapper,
      destroy: () => {
        addVideoButton?.destroy?.();
      },
    };
  } else if (!block.props.showPreview) {
    const file = createDefaultFilePreview(block).dom;
    const element = createFileAndCaptionWrapper(block, file);

    return {
      dom: element.dom,
    };
  } else {
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

    const file = createResizeHandlesWrapper(
      block,
      editor,
      video,
      () => video.width,
      (width) => (video.width = width)
    );

    const element = createFileAndCaptionWrapper(block, file.dom);
    wrapper.appendChild(element.dom);

    return {
      dom: wrapper,
      destroy: file.destroy,
    };
  }
};

export const videoParse = (
  element: HTMLElement
): Partial<Props<typeof videoBlockConfig.propSchema>> | undefined => {
  if (element.tagName === "VIDEO") {
    return parseVideoElement(element as HTMLVideoElement);
  }

  if (element.tagName === "FIGURE") {
    const parsedFigure = parseFigureElement(element, "video");
    if (!parsedFigure) {
      return undefined;
    }

    const { targetElement, caption } = parsedFigure;

    return {
      ...parseVideoElement(targetElement as HTMLVideoElement),
      caption,
    };
  }

  return undefined;
};

export const videoToExternalHTML = (
  block: BlockFromConfig<typeof videoBlockConfig, any, any>
) => {
  if (!block.props.url) {
    const div = document.createElement("p");
    div.textContent = "Add video";

    return {
      dom: div,
    };
  }

  let video;
  if (block.props.showPreview) {
    video = document.createElement("video");
    video.src = block.props.url;
    video.width = block.props.previewWidth;
  } else {
    video = document.createElement("a");
    video.href = block.props.url;
    video.textContent = block.props.name || block.props.url;
  }

  if (block.props.caption) {
    if (block.props.showPreview) {
      return createFigureWithCaption(video, block.props.caption);
    } else {
      return createLinkWithCaption(video, block.props.caption);
    }
  }

  return {
    dom: video,
  };
};

export const VideoBlock = createBlockSpec(videoBlockConfig, {
  render: videoRender,
  parse: videoParse,
  toExternalHTML: videoToExternalHTML,
});
