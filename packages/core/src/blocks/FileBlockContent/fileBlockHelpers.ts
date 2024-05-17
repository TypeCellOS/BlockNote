import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import { BlockFromConfig, FileBlockConfig } from "../../schema";

export const createFileIconAndNameDOM = (
  block: BlockFromConfig<FileBlockConfig, any, any>
): { dom: HTMLElement; destroy?: () => void } => {
  const file = document.createElement("div");
  file.className = "bn-file-default-preview";

  const icon = document.createElement("div");
  icon.className = "bn-file-default-preview-icon";
  icon.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3 8L9.00319 2H19.9978C20.5513 2 21 2.45531 21 2.9918V21.0082C21 21.556 20.5551 22 20.0066 22H3.9934C3.44476 22 3 21.5501 3 20.9932V8ZM10 4V9H5V20H19V4H10Z"></path></svg>';

  const fileName = document.createElement("p");
  fileName.className = "bn-file-default-preview-name";
  fileName.innerText = block.props.name || "";

  file.appendChild(icon);
  file.appendChild(fileName);

  return {
    dom: file,
  };
};

export const createFileAndCaptionDOM = (
  block: BlockFromConfig<FileBlockConfig, any, any>,
  editor: BlockNoteEditor<any, any, any>,
  file: HTMLElement
) => {
  // Wrapper element for the file, resize handles and caption.
  const fileAndCaptionWrapper = document.createElement("div");
  fileAndCaptionWrapper.className = "bn-file-and-caption-wrapper";

  // Caption element.
  const caption = document.createElement("p");
  caption.className = "bn-file-caption";
  caption.innerText = block.props.caption;

  fileAndCaptionWrapper.appendChild(file);
  fileAndCaptionWrapper.appendChild(caption);

  return {
    dom: fileAndCaptionWrapper,
  };
};

// TODO: allow icon / text to be passed in
export const createFilePlaceholderDOM = (
  block: BlockFromConfig<FileBlockConfig, any, any>,
  editor: BlockNoteEditor<any, any, any>
) => {
  // Button element that acts as a placeholder for files with no src.
  const addFileButton = document.createElement("div");
  addFileButton.className = "bn-add-file-button";

  // Icon for the add file button.
  const addFileButtonIcon = document.createElement("div");
  addFileButtonIcon.className = "bn-add-file-button-icon";

  // Text for the add file button.
  const addFileButtonText = document.createElement("p");
  addFileButtonText.className = "bn-add-file-button-text";

  addFileButtonText.innerHTML =
    /*`${editor.dictionary.file.button_add_text} ${
    block.props.fileType &&
    extensions &&
    block.props.fileType in extensions &&
    extensions[block.props.fileType].buttonText !== undefined
      ? extensions[block.props.fileType].buttonText!
      : */ editor.dictionary.file.button_add_file_text;
  // }`;

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

  // if (
  //   block.props.fileType &&
  //   extensions &&
  //   block.props.fileType in extensions &&
  //   extensions[block.props.fileType].buttonIcon !== undefined
  // ) {
  //   addFileButtonIcon.appendChild(
  //     extensions[block.props.fileType].buttonIcon!()
  //   );
  // } else {
  addFileButtonIcon.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3 8L9.00319 2H19.9978C20.5513 2 21 2.45531 21 2.9918V21.0082C21 21.556 20.5551 22 20.0066 22H3.9934C3.44476 22 3 21.5501 3 20.9932V8ZM10 4V9H5V20H19V4H10Z"></path></svg>';
  // }
  addFileButton.appendChild(addFileButtonIcon);
  addFileButton.appendChild(addFileButtonText);

  addFileButton.addEventListener(
    "mousedown",
    addFileButtonMouseDownHandler,
    true
  );
  addFileButton.addEventListener("click", addFileButtonClickHandler, true);

  return {
    dom: addFileButton,
    destroy: () => {
      addFileButton.removeEventListener(
        "mousedown",
        addFileButtonMouseDownHandler,
        true
      );
      addFileButton.removeEventListener(
        "click",
        addFileButtonClickHandler,
        true
      );
    },
  };
};

export const parseEmbed = (embedElement: HTMLEmbedElement) => {
  const url = embedElement.src || undefined;

  return { url };
};

export const parseFigure = (figureElement: HTMLElement, targetTag: string) => {
  const targetElement = figureElement.querySelector(
    targetTag
  ) as HTMLElement | null;
  if (!targetElement) {
    return undefined;
  }

  const captionElement = figureElement.querySelector("figcaption");
  const caption = captionElement?.textContent ?? undefined;

  return { targetElement, caption };
};

export const toExternalHTMLWithCaption = (
  element: HTMLElement,
  caption: string
) => {
  const figure = document.createElement("figure");
  const captionElement = document.createElement("figcaption");
  captionElement.textContent = caption;

  figure.appendChild(element);
  figure.appendChild(captionElement);

  return { dom: figure };
};
