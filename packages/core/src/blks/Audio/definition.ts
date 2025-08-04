import { parseAudioElement } from "../../blocks/AudioBlockContent/parseAudioElement.js";
import { defaultProps } from "../../blocks/defaultProps.js";
import { parseFigureElement } from "../../blocks/FileBlockContent/helpers/parse/parseFigureElement.js";
import { createFileBlockWrapper } from "../../blocks/FileBlockContent/helpers/render/createFileBlockWrapper.js";
import { createFigureWithCaption } from "../../blocks/FileBlockContent/helpers/toExternalHTML/createFigureWithCaption.js";
import { createLinkWithCaption } from "../../blocks/FileBlockContent/helpers/toExternalHTML/createLinkWithCaption.js";
import {
  createBlockConfig,
  createBlockDefinition,
} from "../../schema/index.js";

export const FILE_AUDIO_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M2 16.0001H5.88889L11.1834 20.3319C11.2727 20.405 11.3846 20.4449 11.5 20.4449C11.7761 20.4449 12 20.2211 12 19.9449V4.05519C12 3.93977 11.9601 3.8279 11.887 3.73857C11.7121 3.52485 11.3971 3.49335 11.1834 3.66821L5.88889 8.00007H2C1.44772 8.00007 1 8.44778 1 9.00007V15.0001C1 15.5524 1.44772 16.0001 2 16.0001ZM23 12C23 15.292 21.5539 18.2463 19.2622 20.2622L17.8445 18.8444C19.7758 17.1937 21 14.7398 21 12C21 9.26016 19.7758 6.80629 17.8445 5.15557L19.2622 3.73779C21.5539 5.75368 23 8.70795 23 12ZM18 12C18 10.0883 17.106 8.38548 15.7133 7.28673L14.2842 8.71584C15.3213 9.43855 16 10.64 16 12C16 13.36 15.3213 14.5614 14.2842 15.2841L15.7133 16.7132C17.106 15.6145 18 13.9116 18 12Z"></path></svg>';

export interface AudioOptions {
  icon?: string;
}
const config = createBlockConfig((_ctx: AudioOptions) => ({
  type: "audio" as const,
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

    showPreview: {
      default: true,
    },
  },
  content: "none" as const,
  meta: {
    fileBlockAccept: ["audio/*"],
  },
}));

export const definition = createBlockDefinition(config).implementation(
  (config) => ({
    parse: (element) => {
      if (element.tagName === "AUDIO") {
        // Ignore if parent figure has already been parsed.
        if (element.closest("figure")) {
          return undefined;
        }

        return parseAudioElement(element as HTMLAudioElement);
      }

      if (element.tagName === "FIGURE") {
        const parsedFigure = parseFigureElement(element, "audio");
        if (!parsedFigure) {
          return undefined;
        }

        const { targetElement, caption } = parsedFigure;

        return {
          ...parseAudioElement(targetElement as HTMLAudioElement),
          caption,
        };
      }

      return undefined;
    },
    render: (block, editor) => {
      const icon = document.createElement("div");
      icon.innerHTML = config.icon ?? FILE_AUDIO_ICON_SVG;

      const audio = document.createElement("audio");
      audio.className = "bn-audio";
      if (editor.resolveFileUrl) {
        editor.resolveFileUrl(block.props.url).then((downloadUrl) => {
          audio.src = downloadUrl;
        });
      } else {
        audio.src = block.props.url;
      }
      audio.controls = true;
      audio.contentEditable = "false";
      audio.draggable = false;

      return createFileBlockWrapper(
        block,
        editor,
        { dom: audio },
        editor.dictionary.file_blocks.audio.add_button_text,
        icon.firstElementChild as HTMLElement,
      );
    },
    toExternalHTML(block) {
      if (!block.props.url) {
        const div = document.createElement("p");
        div.textContent = "Add audio";

        return {
          dom: div,
        };
      }

      let audio;
      if (block.props.showPreview) {
        audio = document.createElement("audio");
        audio.src = block.props.url;
      } else {
        audio = document.createElement("a");
        audio.href = block.props.url;
        audio.textContent = block.props.name || block.props.url;
      }

      if (block.props.caption) {
        if (block.props.showPreview) {
          return createFigureWithCaption(audio, block.props.caption);
        } else {
          return createLinkWithCaption(audio, block.props.caption);
        }
      }

      return {
        dom: audio,
      };
    },
    runsBefore: ["file"],
  }),
);
