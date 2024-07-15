import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import { BlockFromConfig, FileBlockConfig } from "../../schema";

// Default file preview, displaying a file icon and file name.
export const createDefaultFilePreview = (
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
  fileName.textContent = block.props.name || "";

  file.appendChild(icon);
  file.appendChild(fileName);

  return {
    dom: file,
  };
};

// Wrapper element containing file preview and caption.
export const createFileAndCaptionWrapper = (
  block: BlockFromConfig<FileBlockConfig, any, any>,
  file: HTMLElement
) => {
  const fileAndCaptionWrapper = document.createElement("div");
  fileAndCaptionWrapper.className = "bn-file-and-caption-wrapper";

  const caption = document.createElement("p");
  caption.className = "bn-file-caption";
  caption.textContent = block.props.caption;

  fileAndCaptionWrapper.appendChild(file);
  fileAndCaptionWrapper.appendChild(caption);

  return {
    dom: fileAndCaptionWrapper,
  };
};

// Button element that acts as a placeholder for files with no src.
export const createAddFileButton = (
  block: BlockFromConfig<FileBlockConfig, any, any>,
  editor: BlockNoteEditor<any, any, any>,
  buttonText?: string,
  buttonIcon?: HTMLElement
) => {
  const addFileButton = document.createElement("div");
  addFileButton.className = "bn-add-file-button";

  const addFileButtonIcon = document.createElement("div");
  addFileButtonIcon.className = "bn-add-file-button-icon";
  if (buttonIcon) {
    addFileButtonIcon.appendChild(buttonIcon);
  } else {
    addFileButtonIcon.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3 8L9.00319 2H19.9978C20.5513 2 21 2.45531 21 2.9918V21.0082C21 21.556 20.5551 22 20.0066 22H3.9934C3.44476 22 3 21.5501 3 20.9932V8ZM10 4V9H5V20H19V4H10Z"></path></svg>';
  }

  const addFileButtonText = document.createElement("p");
  addFileButtonText.className = "bn-add-file-button-text";
  addFileButtonText.innerHTML =
    buttonText || editor.dictionary.file_blocks.file.add_button_text;

  // Prevents focus from moving to the button.
  const addFileButtonMouseDownHandler = (event: MouseEvent) => {
    event.preventDefault();
  };
  // Opens the file toolbar.
  const addFileButtonClickHandler = () => {
    editor.dispatch(
      editor._tiptapEditor.state.tr.setMeta(editor.filePanel!.plugin, {
        block: block,
      })
    );
  };

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

export const parseEmbedElement = (embedElement: HTMLEmbedElement) => {
  const url = embedElement.src || undefined;

  return { url };
};

export const parseFigureElement = (
  figureElement: HTMLElement,
  targetTag: string
) => {
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

// Wrapper figure element to display file link with caption. Used for external
// HTML
export const createLinkWithCaption = (
  element: HTMLElement,
  caption: string
) => {
  const wrapper = document.createElement("div");
  const fileCaption = document.createElement("p");
  fileCaption.textContent = caption;

  wrapper.appendChild(element);
  wrapper.appendChild(fileCaption);

  return {
    dom: wrapper,
  };
};

// Wrapper figure element to display file preview with caption. Used for
// external HTML.
export const createFigureWithCaption = (
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

// Wrapper element which adds resize handles & logic for visual media file
// previews.
export const createResizeHandlesWrapper = (
  block: BlockFromConfig<FileBlockConfig, any, any>,
  editor: BlockNoteEditor<any, any, any>,
  element: HTMLElement,
  getWidth: () => number,
  setWidth: (width: number) => void
): { dom: HTMLElement; destroy: () => void } => {
  if (!block.props.previewWidth) {
    throw new Error("Block must have a `previewWidth` prop.");
  }

  // Wrapper element for rendered element and resize handles.
  const wrapper = document.createElement("div");
  wrapper.className = "bn-visual-media-wrapper";

  // Resize handle elements.
  const leftResizeHandle = document.createElement("div");
  leftResizeHandle.className = "bn-visual-media-resize-handle";
  leftResizeHandle.style.left = "4px";
  const rightResizeHandle = document.createElement("div");
  rightResizeHandle.className = "bn-visual-media-resize-handle";
  rightResizeHandle.style.right = "4px";

  // Temporary parameters set when the user begins resizing the element, used to
  // calculate the new width of the element.
  let resizeParams:
    | {
        handleUsed: "left" | "right";
        initialWidth: number;
        initialClientX: number;
      }
    | undefined;

  // Updates the element width with an updated width depending on the cursor X
  // offset from when the resize began, and which resize handle is being used.
  const windowMouseMoveHandler = (event: MouseEvent) => {
    if (!resizeParams) {
      if (
        !editor.isEditable &&
        wrapper.contains(leftResizeHandle) &&
        wrapper.contains(rightResizeHandle)
      ) {
        wrapper.removeChild(leftResizeHandle);
        wrapper.removeChild(rightResizeHandle);
      }

      return;
    }

    let newWidth: number;

    if (block.props.textAlignment === "center") {
      if (resizeParams.handleUsed === "left") {
        newWidth =
          resizeParams.initialWidth +
          (resizeParams.initialClientX - event.clientX) * 2;
      } else {
        newWidth =
          resizeParams.initialWidth +
          (event.clientX - resizeParams.initialClientX) * 2;
      }
    } else {
      if (resizeParams.handleUsed === "left") {
        newWidth =
          resizeParams.initialWidth +
          resizeParams.initialClientX -
          event.clientX;
      } else {
        newWidth =
          resizeParams.initialWidth +
          event.clientX -
          resizeParams.initialClientX;
      }
    }

    // Min element width in px.
    const minWidth = 64;

    // Ensures the element is not wider than the editor and not smaller than a
    // predetermined minimum width.
    if (newWidth < minWidth) {
      setWidth(minWidth);
    } else if (newWidth > editor.domElement.firstElementChild!.clientWidth) {
      setWidth(editor.domElement.firstElementChild!.clientWidth);
    } else {
      setWidth(newWidth);
    }
  };
  // Stops mouse movements from resizing the element and updates the block's
  // `width` prop to the new value.
  const windowMouseUpHandler = (event: MouseEvent) => {
    // Hides the drag handles if the cursor is no longer over the element.
    if (
      (!event.target ||
        !wrapper.contains(event.target as Node) ||
        !editor.isEditable) &&
      wrapper.contains(leftResizeHandle) &&
      wrapper.contains(rightResizeHandle)
    ) {
      wrapper.removeChild(leftResizeHandle);
      wrapper.removeChild(rightResizeHandle);
    }

    if (!resizeParams) {
      return;
    }

    resizeParams = undefined;

    editor.updateBlock(block, {
      props: {
        previewWidth: getWidth(),
      },
    });
  };

  // Shows the resize handles when hovering over the element with the cursor.
  const elementMouseEnterHandler = () => {
    if (editor.isEditable) {
      wrapper.appendChild(leftResizeHandle);
      wrapper.appendChild(rightResizeHandle);
    }
  };
  // Hides the resize handles when the cursor leaves the element, unless the
  // cursor moves to one of the resize handles.
  const elementMouseLeaveHandler = (event: MouseEvent) => {
    if (
      event.relatedTarget === leftResizeHandle ||
      event.relatedTarget === rightResizeHandle
    ) {
      return;
    }

    if (resizeParams) {
      return;
    }

    if (
      editor.isEditable &&
      wrapper.contains(leftResizeHandle) &&
      wrapper.contains(rightResizeHandle)
    ) {
      wrapper.removeChild(leftResizeHandle);
      wrapper.removeChild(rightResizeHandle);
    }
  };

  // Sets the resize params, allowing the user to begin resizing the element by
  // moving the cursor left or right.
  const leftResizeHandleMouseDownHandler = (event: MouseEvent) => {
    event.preventDefault();

    wrapper.appendChild(leftResizeHandle);
    wrapper.appendChild(rightResizeHandle);

    resizeParams = {
      handleUsed: "left",
      initialWidth: block.props.previewWidth!,
      initialClientX: event.clientX,
    };
  };
  const rightResizeHandleMouseDownHandler = (event: MouseEvent) => {
    event.preventDefault();

    wrapper.appendChild(leftResizeHandle);
    wrapper.appendChild(rightResizeHandle);

    resizeParams = {
      handleUsed: "right",
      initialWidth: block.props.previewWidth!,
      initialClientX: event.clientX,
    };
  };

  wrapper.appendChild(element);

  window.addEventListener("mousemove", windowMouseMoveHandler);
  window.addEventListener("mouseup", windowMouseUpHandler);
  element.addEventListener("mouseenter", elementMouseEnterHandler);
  element.addEventListener("mouseleave", elementMouseLeaveHandler);
  leftResizeHandle.addEventListener(
    "mousedown",
    leftResizeHandleMouseDownHandler
  );
  rightResizeHandle.addEventListener(
    "mousedown",
    rightResizeHandleMouseDownHandler
  );

  return {
    dom: wrapper,
    destroy: () => {
      window.removeEventListener("mousemove", windowMouseMoveHandler);
      window.removeEventListener("mouseup", windowMouseUpHandler);
      element.removeEventListener("mouseenter", elementMouseEnterHandler);
      element.removeEventListener("mouseleave", elementMouseLeaveHandler);
      leftResizeHandle.removeEventListener(
        "mousedown",
        leftResizeHandleMouseDownHandler
      );
      rightResizeHandle.removeEventListener(
        "mousedown",
        rightResizeHandleMouseDownHandler
      );
    },
  };
};
