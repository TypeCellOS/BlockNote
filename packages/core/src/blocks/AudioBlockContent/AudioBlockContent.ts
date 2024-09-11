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
  parseFigureElement,
} from "../FileBlockContent/fileBlockHelpers";
import { parseAudioElement } from "./audioBlockHelpers";

export const audioPropSchema = {
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
} satisfies PropSchema;

export const audioBlockConfig = {
  type: "audio" as const,
  propSchema: audioPropSchema,
  content: "none",
  isFileBlock: true,
  fileBlockAccept: ["audio/*"],
} satisfies FileBlockConfig;

export const audioRender = (
  block: BlockFromConfig<typeof audioBlockConfig, any, any>,
  editor: BlockNoteEditor<any, any, any>
) => {
  const wrapper = document.createElement("div");
  wrapper.className = "bn-file-block-content-wrapper";

  if (block.props.url === "") {
    const fileBlockAudioIcon = document.createElement("div");
    fileBlockAudioIcon.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M2 16.0001H5.88889L11.1834 20.3319C11.2727 20.405 11.3846 20.4449 11.5 20.4449C11.7761 20.4449 12 20.2211 12 19.9449V4.05519C12 3.93977 11.9601 3.8279 11.887 3.73857C11.7121 3.52485 11.3971 3.49335 11.1834 3.66821L5.88889 8.00007H2C1.44772 8.00007 1 8.44778 1 9.00007V15.0001C1 15.5524 1.44772 16.0001 2 16.0001ZM23 12C23 15.292 21.5539 18.2463 19.2622 20.2622L17.8445 18.8444C19.7758 17.1937 21 14.7398 21 12C21 9.26016 19.7758 6.80629 17.8445 5.15557L19.2622 3.73779C21.5539 5.75368 23 8.70795 23 12ZM18 12C18 10.0883 17.106 8.38548 15.7133 7.28673L14.2842 8.71584C15.3213 9.43855 16 10.64 16 12C16 13.36 15.3213 14.5614 14.2842 15.2841L15.7133 16.7132C17.106 15.6145 18 13.9116 18 12Z"></path></svg>';
    const addAudioButton = createAddFileButton(
      block,
      editor,
      editor.dictionary.file_blocks.audio.add_button_text,
      fileBlockAudioIcon.firstElementChild as HTMLElement
    );
    wrapper.appendChild(addAudioButton.dom);

    return {
      dom: wrapper,
      destroy: () => {
        addAudioButton?.destroy?.();
      },
    };
  } else if (!block.props.showPreview) {
    const file = createDefaultFilePreview(block).dom;
    const element = createFileAndCaptionWrapper(block, file);

    return {
      dom: element.dom,
    };
  } else {
    const audio = document.createElement("audio");
    audio.className = "bn-audio";
    editor.resolveFileUrl(block.props.url).then((downloadUrl) => {
      audio.src = downloadUrl;
    });
    audio.controls = true;
    audio.contentEditable = "false";
    audio.draggable = false;

    const element = createFileAndCaptionWrapper(block, audio);
    wrapper.appendChild(element.dom);

    return {
      dom: wrapper,
    };
  }
};

export const audioParse = (
  element: HTMLElement
): Partial<Props<typeof audioBlockConfig.propSchema>> | undefined => {
  if (element.tagName === "AUDIO") {
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
};

export const audioToExternalHTML = (
  block: BlockFromConfig<typeof audioBlockConfig, any, any>
) => {
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
};

export const AudioBlock = createBlockSpec(audioBlockConfig, {
  render: audioRender,
  parse: audioParse,
  toExternalHTML: audioToExternalHTML,
});
