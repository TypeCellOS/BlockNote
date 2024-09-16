import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import {
  BlockFromConfig,
  FileBlockConfig,
  PropSchema,
  createBlockSpec,
} from "../../schema";
import { defaultProps } from "../defaultProps";
import {
  createAddFileButton,
  createDefaultFilePreview,
  createFileAndCaptionWrapper,
  createLinkWithCaption,
  parseEmbedElement,
  parseFigureElement,
} from "./fileBlockHelpers";

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
  // Wrapper element to set the file alignment, contains both file/file
  // upload dashboard and caption.
  const wrapper = document.createElement("div");
  wrapper.className = "bn-file-block-content-wrapper";

  const loading = document.createElement("div");
  loading.className = "bn-file-loading-preview";
  loading.textContent = "Loading...";

  if (block.props.url === "") {
    const addFileButton = createAddFileButton(block, editor);

    if (
      editor.fileUploadStatus.uploading &&
      editor.fileUploadStatus.blockId === block.id
    ) {
      wrapper.appendChild(loading);
    } else {
      wrapper.appendChild(addFileButton.dom);
    }

    const destroyUploadStartHandler = editor.onUploadStart((blockId) => {
      if (blockId === block.id) {
        wrapper.removeChild(addFileButton.dom);
        wrapper.appendChild(loading);
      }
    });
    const destroyUploadEndHandler = editor.onUploadEnd((blockId) => {
      if (blockId === block.id) {
        wrapper.removeChild(loading);
        wrapper.appendChild(addFileButton.dom);
      }
    });

    return {
      dom: wrapper,
      destroy: () => {
        addFileButton.destroy?.();
        destroyUploadStartHandler();
        destroyUploadEndHandler();
      },
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
  block: BlockFromConfig<typeof fileBlockConfig, any, any>,
  editor: BlockNoteEditor<any, any, any>
) => {
  if (!block.props.url) {
    if (
      editor.fileUploadStatus.uploading &&
      editor.fileUploadStatus.blockId === block.id
    ) {
      const loading = document.createElement("div");
      loading.textContent = "Loading...";

      return {
        dom: loading,
      };
    }

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
