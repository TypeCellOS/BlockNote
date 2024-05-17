import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import {
  BlockFromConfig,
  FileBlockConfig,
  PropSchema,
  createBlockSpec,
} from "../../schema";
import { defaultProps } from "../defaultProps";

import {
  createFileAndCaptionDOM,
  createFileIconAndNameDOM,
  createFilePlaceholderDOM,
  parseEmbed,
  parseFigure,
  toExternalHTMLWithCaption,
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

  // const fileType = block.props.fileType;
  // block.props.showPreview && fileType && extensions && fileType in extensions
  // ? extensions[fileType].render(block, editor)
  // : defaultFileRender(block);

  // File element.

  if (block.props.url === "") {
    const placeholder = createFilePlaceholderDOM(block, editor);
    wrapper.appendChild(placeholder.dom);

    return {
      dom: wrapper,
      destroy: () => {
        placeholder?.destroy?.();
      },
    };
  } else {
    const file = createFileIconAndNameDOM(block).dom;
    const element = createFileAndCaptionDOM(block, editor, file);
    wrapper.appendChild(element.dom);

    return {
      dom: wrapper,
    };
  }
};

export const fileParse = (element: HTMLElement) => {
  if (element.tagName === "EMBED") {
    return parseEmbed(element as HTMLEmbedElement);
  }

  if (element.tagName === "FIGURE") {
    const parsedFigure = parseFigure(element, "embed");
    if (!parsedFigure) {
      return undefined;
    }

    const { targetElement, caption } = parsedFigure;

    return {
      ...parseEmbed(targetElement as HTMLEmbedElement),
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

  // TBD: should default be of type "embed"?
  const embed = document.createElement("embed");
  embed.src = block.props.url;

  if (block.props.caption) {
    return toExternalHTMLWithCaption(embed, block.props.caption);
  }

  return {
    dom: embed,
  };
};

export const FileBlock = createBlockSpec(fileBlockConfig, {
  render: fileRender,
  parse: fileParse,
  toExternalHTML: fileToExternalHTML,
});

// - React support?
// - Support parse HTML and toExternalHTML
// - Copy/paste support
// - Drag/drop from external into BlockNote (automatic conversion to block & upload)
// - Custom props e.g. PDF height, video playback options
// - Toolbar/menu options should change based on file type
// - Button text/icon should be file type specific
// - Should be able to define the file type before uploading/embedding
// - Media like pdfs should be previewable (might be issues with cross domain access)
// - Renderers should be loosely coupled to file extensions via plugins for different file types
