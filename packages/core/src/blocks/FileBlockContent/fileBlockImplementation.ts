import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import {
  BlockFromConfig,
  BlockSchemaWithBlock,
  CustomBlockImplementation,
} from "../../schema";
import { fileBlockConfig } from "./fileBlockConfig";
import { FileBlockExtension } from "./fileBlockExtension";

const defaultFileRender = (
  block: BlockFromConfig<typeof fileBlockConfig, any, any>
): { dom: HTMLElement; destroy?: () => void } => {
  const file = document.createElement("div");
  file.className = "bn-file";
  file.contentEditable = "false";
  file.draggable = false;
  file.innerHTML = block.props.url.split("/").pop() || "";

  return {
    dom: file,
  };
};

export const fileRender = (
  block: BlockFromConfig<typeof fileBlockConfig, any, any>,
  editor: BlockNoteEditor<
    BlockSchemaWithBlock<"file", typeof fileBlockConfig>,
    any,
    any
  >,
  extensions?: Record<
    string,
    Pick<FileBlockExtension, "buttonText" | "buttonIcon" | "render">
  >
) => {
  // Wrapper element to set the file alignment, contains both file/file
  // upload dashboard and caption.
  const wrapper = document.createElement("div");
  wrapper.className = "bn-file-block-content-wrapper";

  // Button element that acts as a placeholder for files with no src.
  const addFileButton = document.createElement("div");
  addFileButton.className = "bn-add-file-button";

  // Icon for the add file button.
  const addFileButtonIcon = document.createElement("div");
  addFileButtonIcon.className = "bn-add-file-button-icon";

  // Text for the add file button.
  const addFileButtonText = document.createElement("p");
  addFileButtonText.className = "bn-add-file-button-text";
  addFileButtonText.innerHTML = `Add ${
    block.props.fileType &&
    extensions &&
    block.props.fileType in extensions &&
    extensions[block.props.fileType].buttonText !== undefined
      ? extensions[block.props.fileType].buttonText!
      : "file"
  }`;

  // Wrapper element for the file, resize handles and caption.
  const fileAndCaptionWrapper = document.createElement("div");
  fileAndCaptionWrapper.className = "bn-file-and-caption-wrapper";

  const fileType = block.props.fileType;
  const renderedFileExtension =
    fileType && extensions && fileType in extensions
      ? extensions[fileType].render(block, editor)
      : defaultFileRender(block);

  // File element.
  const file = renderedFileExtension.dom;

  // Caption element.
  const caption = document.createElement("p");
  caption.className = "bn-file-caption";
  caption.innerHTML = block.props.caption;

  // Prevents focus from moving to the button.
  const addFileButtonMouseDownHandler = (event: MouseEvent) => {
    event.preventDefault();
  };
  // Opens the file toolbar.
  const addFileButtonClickHandler = () => {
    editor._tiptapEditor.view.dispatch(
      editor._tiptapEditor.state.tr.setMeta(editor.filePanel!.plugin, {
        block: block,
      })
    );
  };

  if (
    block.props.fileType &&
    extensions &&
    block.props.fileType in extensions &&
    extensions[block.props.fileType].buttonIcon !== undefined
  ) {
    addFileButtonIcon.appendChild(
      extensions[block.props.fileType].buttonIcon!()
    );
  } else {
    addFileButtonIcon.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3 8L9.00319 2H19.9978C20.5513 2 21 2.45531 21 2.9918V21.0082C21 21.556 20.5551 22 20.0066 22H3.9934C3.44476 22 3 21.5501 3 20.9932V8ZM10 4V9H5V20H19V4H10Z"></path></svg>';
  }
  addFileButton.appendChild(addFileButtonIcon);
  addFileButton.appendChild(addFileButtonText);

  fileAndCaptionWrapper.appendChild(file);
  fileAndCaptionWrapper.appendChild(caption);

  if (block.props.url === "") {
    wrapper.appendChild(addFileButton);
  } else {
    wrapper.appendChild(fileAndCaptionWrapper);
  }

  addFileButton.addEventListener("mousedown", addFileButtonMouseDownHandler);
  addFileButton.addEventListener("click", addFileButtonClickHandler);

  return {
    dom: wrapper,
    destroy: () => {
      addFileButton.removeEventListener(
        "mousedown",
        addFileButtonMouseDownHandler
      );
      addFileButton.removeEventListener("click", addFileButtonClickHandler);
      renderedFileExtension?.destroy?.();
    },
  };
};

export const fileParse = (
  element: HTMLElement,
  parseExtensions?: Record<string, Pick<FileBlockExtension, "parse">>
) => {
  // Checks if any extensions can parse the element.
  const propsFromExtension = Object.values(parseExtensions || {})
    .map((extension) =>
      extension.parse ? extension.parse(element) : undefined
    )
    .find((item) => item !== undefined);

  if (propsFromExtension) {
    return propsFromExtension;
  }

  // Falls back to default parsing logic.
  if (element.tagName === "EMBED") {
    const fileType = element.getAttribute("type");
    const url = element.getAttribute("src");
    const previewWidth = element.getAttribute("width");

    return {
      fileType:
        fileType && parseExtensions && fileType in parseExtensions
          ? fileType.split("/")[0]
          : undefined,
      url: url || undefined,
      previewWidth: previewWidth ? parseInt(previewWidth) : undefined,
    };
  }

  if (element.tagName === "FIGURE") {
    const fileElement = element.querySelector("embed");
    const captionElement = element.querySelector("figcaption");

    const fileType = fileElement?.type;
    const url = fileElement?.src;
    const previewWidth = fileElement?.width;
    const caption = captionElement?.textContent;

    return {
      fileType:
        fileType && parseExtensions && fileType in parseExtensions
          ? fileType.split("/")[0]
          : undefined,
      url: url || undefined,
      previewWidth: previewWidth ? parseInt(previewWidth) : undefined,
      caption: caption || undefined,
    };
  }

  return undefined;
};

export const fileToExternalHTML = (
  block: BlockFromConfig<typeof fileBlockConfig, any, any>,
  editor: BlockNoteEditor<
    BlockSchemaWithBlock<"file", typeof fileBlockConfig>,
    any,
    any
  >,
  extensions?: Record<
    string,
    Pick<FileBlockExtension, "buttonText" | "toExternalHTML">
  >
) => {
  if (!block.props.url) {
    const div = document.createElement("p");
    const buttonText =
      extensions && block.props.fileType in extensions
        ? extensions[block.props.fileType].buttonText
        : "file";
    div.innerHTML = `Add ${buttonText}`;

    return {
      dom: div,
    };
  }

  if (
    extensions &&
    block.props.fileType &&
    block.props.fileType in extensions &&
    extensions[block.props.fileType].toExternalHTML
  ) {
    return extensions[block.props.fileType].toExternalHTML!(block, editor);
  }

  const embed = document.createElement("embed");
  if (block.props.fileType) {
    embed.type = block.props.fileType;
  }
  embed.src = block.props.url;

  if (block.props.caption) {
    const figure = document.createElement("figure");
    const caption = document.createElement("figcaption");

    caption.textContent = block.props.caption;

    figure.appendChild(embed);
    figure.appendChild(caption);

    return {
      dom: figure,
    };
  }

  return {
    dom: embed,
  };
};

export const createFileBlockImplementation = (
  extensions?: Record<string, FileBlockExtension>
) =>
  ({
    render: (block, editor) => fileRender(block, editor, extensions),
    parse: (element) => fileParse(element, extensions),
    toExternalHTML: (block, editor) =>
      fileToExternalHTML(block, editor, extensions),
  } satisfies CustomBlockImplementation<typeof fileBlockConfig, any, any>);
