import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import {
  BlockFromConfig,
  BlockSchemaWithBlock,
  FileBlockConfig,
} from "../../schema/index.js";

export const FILE_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3 8L9.00319 2H19.9978C20.5513 2 21 2.45531 21 2.9918V21.0082C21 21.556 20.5551 22 20.0066 22H3.9934C3.44476 22 3 21.5501 3 20.9932V8ZM10 4V9H5V20H19V4H10Z"></path></svg>`;

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
  addFileButton.appendChild(addFileButtonIcon);

  const addFileButtonText = document.createElement("p");
  addFileButtonText.className = "bn-add-file-button-text";
  addFileButtonText.innerHTML =
    buttonText || editor.dictionary.file_blocks.file.add_button_text;
  addFileButton.appendChild(addFileButtonText);

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

export const createDefaultFilePreview = (
  block: BlockFromConfig<FileBlockConfig, any, any>
): { dom: HTMLElement; destroy?: () => void } => {
  const file = document.createElement("div");
  file.className = "bn-file-default-preview";

  const icon = document.createElement("div");
  icon.className = "bn-file-default-preview-icon";
  icon.innerHTML = FILE_ICON_SVG;
  file.appendChild(icon);

  const fileName = document.createElement("p");
  fileName.className = "bn-file-default-preview-name";
  fileName.textContent = block.props.name;
  file.appendChild(fileName);

  return {
    dom: file,
  };
};

export const createFileBlockWrapper = (
  block: BlockFromConfig<FileBlockConfig, any, any>,
  editor: BlockNoteEditor<
    BlockSchemaWithBlock<FileBlockConfig["type"], FileBlockConfig>,
    any,
    any
  >,
  element?: { dom: HTMLElement; destroy?: () => void },
  buttonText?: string,
  buttonIcon?: HTMLElement
) => {
  const wrapper = document.createElement("div");
  wrapper.className = "bn-file-block-content-wrapper";

  const loading = document.createElement("div");
  loading.className = "bn-file-loading-preview";
  loading.textContent = "Loading...";

  const addFileButton = createAddFileButton(
    block,
    editor,
    buttonText,
    buttonIcon
  );

  const defaultFilePreview = createDefaultFilePreview(block);

  const caption = document.createElement("p");
  caption.className = "bn-file-caption";
  caption.textContent = block.props.caption;

  const destroyUploadStartHandler = editor.onUploadStart((blockId) => {
    if (blockId === block.id) {
      wrapper.removeChild(addFileButton.dom);
      wrapper.appendChild(loading);
    }
  });
  const destroyUploadEndHandler = editor.onUploadEnd((blockId) => {
    if (blockId === block.id) {
      wrapper.removeChild(loading);
      wrapper.appendChild(element ? element.dom : defaultFilePreview.dom);
    }
  });

  if (block.props.url === "") {
    // Show the add file button if the file has not been uploaded yet.
    wrapper.appendChild(addFileButton.dom);
  } else {
    // Show the file preview and caption if the file has been uploaded.
    if (block.props.showPreview === false || !element) {
      // Use default preview.
      wrapper.appendChild(defaultFilePreview.dom);
    } else {
      // Use custom preview.
      wrapper.appendChild(element.dom);
    }
    if (block.props.caption) {
      // Show the caption if there is one.
      wrapper.appendChild(caption);
    }
  }

  return {
    dom: wrapper,
    destroy: () => {
      destroyUploadStartHandler();
      destroyUploadEndHandler();
      addFileButton.destroy();
      defaultFilePreview.destroy?.();
    },
  };
};

export const createResizableFileBlockWrapper = (
  block: BlockFromConfig<FileBlockConfig, any, any>,
  editor: BlockNoteEditor<any, any, any>,
  element?: { dom: HTMLElement; destroy?: () => void },
  resizeHandlesContainerElement?: HTMLElement,
  buttonText?: string,
  buttonIcon?: HTMLElement
): { dom: HTMLElement; destroy: () => void } => {
  const { dom, destroy } = createFileBlockWrapper(
    block,
    editor,
    element,
    buttonText,
    buttonIcon
  );
  const wrapper = dom;
  if (block.props.url && block.props.showPreview) {
    wrapper.style.width = `${block.props.previewWidth}px`;
  }

  const resizeHandlesContainer = resizeHandlesContainerElement || wrapper;

  const leftResizeHandle = document.createElement("div");
  leftResizeHandle.className = "bn-resize-handle";
  leftResizeHandle.style.left = "4px";
  const rightResizeHandle = document.createElement("div");
  rightResizeHandle.className = "bn-resize-handle";
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
        resizeHandlesContainer.contains(leftResizeHandle) &&
        resizeHandlesContainer.contains(rightResizeHandle)
      ) {
        resizeHandlesContainer.removeChild(leftResizeHandle);
        resizeHandlesContainer.removeChild(rightResizeHandle);
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

    // Ensures the element is not wider than the editor and not narrower than a
    // predetermined minimum width.
    if (newWidth < minWidth) {
      wrapper.style.width = `${minWidth}px`;
    } else {
      wrapper.style.width = `${newWidth}px`;
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
      resizeHandlesContainer.contains(leftResizeHandle) &&
      resizeHandlesContainer.contains(rightResizeHandle)
    ) {
      resizeHandlesContainer.removeChild(leftResizeHandle);
      resizeHandlesContainer.removeChild(rightResizeHandle);
    }

    if (!resizeParams) {
      return;
    }

    resizeParams = undefined;

    editor.updateBlock(block, {
      props: {
        previewWidth: parseInt(wrapper.style.width.replace("px", "")),
      },
    });
  };

  // Shows the resize handles when hovering over the wrapper with the cursor.
  const wrapperMouseEnterHandler = () => {
    if (editor.isEditable) {
      resizeHandlesContainer.appendChild(leftResizeHandle);
      resizeHandlesContainer.appendChild(rightResizeHandle);
    }
  };
  // Hides the resize handles when the cursor leaves the wrapper, unless the
  // cursor moves to one of the resize handles.
  const wrapperMouseLeaveHandler = (event: MouseEvent) => {
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
      resizeHandlesContainer.contains(leftResizeHandle) &&
      resizeHandlesContainer.contains(rightResizeHandle)
    ) {
      resizeHandlesContainer.removeChild(leftResizeHandle);
      resizeHandlesContainer.removeChild(rightResizeHandle);
    }
  };

  // Sets the resize params, allowing the user to begin resizing the element by
  // moving the cursor left or right.
  const leftResizeHandleMouseDownHandler = (event: MouseEvent) => {
    event.preventDefault();

    resizeParams = {
      handleUsed: "left",
      initialWidth: wrapper.clientWidth,
      initialClientX: event.clientX,
    };
  };
  const rightResizeHandleMouseDownHandler = (event: MouseEvent) => {
    event.preventDefault();

    resizeParams = {
      handleUsed: "right",
      initialWidth: wrapper.clientWidth,
      initialClientX: event.clientX,
    };
  };

  window.addEventListener("mousemove", windowMouseMoveHandler);
  window.addEventListener("mouseup", windowMouseUpHandler);
  wrapper.addEventListener("mouseenter", wrapperMouseEnterHandler);
  wrapper.addEventListener("mouseleave", wrapperMouseLeaveHandler);
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
      destroy();
      window.removeEventListener("mousemove", windowMouseMoveHandler);
      window.removeEventListener("mouseup", windowMouseUpHandler);
      wrapper.removeEventListener("mouseenter", wrapperMouseEnterHandler);
      wrapper.removeEventListener("mouseleave", wrapperMouseLeaveHandler);
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
