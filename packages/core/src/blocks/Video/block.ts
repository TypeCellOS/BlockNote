import { createBlockConfig, createBlockSpec } from "../../schema/index.js";
import { defaultProps, parseDefaultProps } from "../defaultProps.js";
import { parseFigureElement } from "../File/helpers/parse/parseFigureElement.js";
import { createResizableFileBlockWrapper } from "../File/helpers/render/createResizableFileBlockWrapper.js";
import { createFigureWithCaption } from "../File/helpers/toExternalHTML/createFigureWithCaption.js";
import { createLinkWithCaption } from "../File/helpers/toExternalHTML/createLinkWithCaption.js";
import { parseVideoElement } from "./parseVideoElement.js";

export const FILE_VIDEO_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M2 3.9934C2 3.44476 2.45531 3 2.9918 3H21.0082C21.556 3 22 3.44495 22 3.9934V20.0066C22 20.5552 21.5447 21 21.0082 21H2.9918C2.44405 21 2 20.5551 2 20.0066V3.9934ZM8 5V19H16V5H8ZM4 5V7H6V5H4ZM18 5V7H20V5H18ZM4 9V11H6V9H4ZM18 9V11H20V9H18ZM4 13V15H6V13H4ZM18 13V15H20V13H18ZM4 17V19H6V17H4ZM18 17V19H20V17H18Z"></path></svg>';

export interface VideoOptions {
  icon?: string;
}

export type VideoBlockConfig = ReturnType<typeof createVideoBlockConfig>;

export const createVideoBlockConfig = createBlockConfig(
  (_ctx: VideoOptions) => ({
    type: "video" as const,
    propSchema: {
      textAlignment: defaultProps.textAlignment,
      backgroundColor: defaultProps.backgroundColor,
      name: { default: "" as const },
      url: { default: "" as const },
      caption: { default: "" as const },
      showPreview: { default: true },
      previewWidth: { default: undefined, type: "number" as const },
    },
    content: "none" as const,
  }),
);

export const videoParse = (_config: VideoOptions) => (element: HTMLElement) => {
  if (element.tagName === "VIDEO") {
    // Ignore if parent figure has already been parsed.
    if (element.closest("figure")) {
      return undefined;
    }

    const { backgroundColor } = parseDefaultProps(element);

    return {
      ...parseVideoElement(element as HTMLVideoElement),
      backgroundColor,
    };
  }

  if (element.tagName === "FIGURE") {
    const parsedFigure = parseFigureElement(element, "video");
    if (!parsedFigure) {
      return undefined;
    }

    const { targetElement, caption } = parsedFigure;

    const { backgroundColor } = parseDefaultProps(element);

    return {
      ...parseVideoElement(targetElement as HTMLVideoElement),
      backgroundColor,
      caption,
    };
  }

  return undefined;
};

export const createVideoBlockSpec = createBlockSpec(
  createVideoBlockConfig,
  (config) => ({
    meta: {
      fileBlockAccept: ["video/*"],
    },
    parse: videoParse(config),
    render(block, editor) {
      const icon = document.createElement("div");
      icon.innerHTML = config.icon ?? FILE_VIDEO_ICON_SVG;

      const videoWrapper = document.createElement("div");
      videoWrapper.className = "bn-visual-media-wrapper";

      const video = document.createElement("video");
      video.className = "bn-visual-media";
      if (editor.resolveFileUrl) {
        editor.resolveFileUrl(block.props.url).then((downloadUrl) => {
          video.src = downloadUrl;
        });
      } else {
        video.src = block.props.url;
      }
      video.controls = true;
      video.contentEditable = "false";
      video.draggable = false;
      video.width = block.props.previewWidth;
      videoWrapper.appendChild(video);

      return createResizableFileBlockWrapper(
        block,
        editor,
        { dom: videoWrapper },
        videoWrapper,
        icon.firstElementChild as HTMLElement,
      );
    },
    toExternalHTML(block) {
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
        if (block.props.previewWidth) {
          video.width = block.props.previewWidth;
        }
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
    },
    runsBefore: ["file"],
  }),
);
