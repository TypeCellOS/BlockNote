import type { BlockNoteEditor } from "../../../editor/BlockNoteEditor";
import { BlockFromConfig, BlockSchemaWithBlock } from "../../../schema";
import { fileBlockConfig } from "../fileBlockConfig";
import { FileBlockExtension } from "../fileBlockExtension";

const renderImageFile = (
  block: BlockFromConfig<typeof fileBlockConfig, any, any>,
  editor: BlockNoteEditor<
    BlockSchemaWithBlock<"file", typeof fileBlockConfig>,
    any,
    any
  >
): { dom: HTMLElement; destroy?: () => void } => {
  // Wrapper element for the image and resize handles.
  const imageWrapper = document.createElement("div");
  imageWrapper.className = "bn-image-wrapper";

  // Image element.
  const image = document.createElement("img");
  image.className = "bn-image";
  image.src = block.props.url;
  image.alt = block.props.caption || "BlockNote image";
  image.contentEditable = "false";
  image.draggable = false;
  image.width = Math.min(
    block.props.previewWidth,
    editor.domElement.firstElementChild!.clientWidth
  );

  // Resize handle elements.
  const leftResizeHandle = document.createElement("div");
  leftResizeHandle.className = "bn-image-resize-handle";
  leftResizeHandle.style.left = "4px";
  const rightResizeHandle = document.createElement("div");
  rightResizeHandle.className = "bn-image-resize-handle";
  rightResizeHandle.style.right = "4px";

  // Temporary parameters set when the user begins resizing the image, used to
  // calculate the new width of the image.
  let resizeParams:
    | {
        handleUsed: "left" | "right";
        initialWidth: number;
        initialClientX: number;
      }
    | undefined;

  // Updates the image width with an updated width depending on the cursor X
  // offset from when the resize began, and which resize handle is being used.
  const windowMouseMoveHandler = (event: MouseEvent) => {
    if (!resizeParams) {
      if (
        !editor.isEditable &&
        imageWrapper.contains(leftResizeHandle) &&
        imageWrapper.contains(rightResizeHandle)
      ) {
        imageWrapper.removeChild(leftResizeHandle);
        imageWrapper.removeChild(rightResizeHandle);
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

    // Min image width in px.
    const minWidth = 64;

    // Ensures the image is not wider than the editor and not smaller than a
    // predetermined minimum width.
    if (newWidth < minWidth) {
      image.width = minWidth;
    } else if (newWidth > editor.domElement.firstElementChild!.clientWidth) {
      image.width = editor.domElement.firstElementChild!.clientWidth;
    } else {
      image.width = newWidth;
    }
  };
  // Stops mouse movements from resizing the image and updates the block's
  // `width` prop to the new value.
  const windowMouseUpHandler = (event: MouseEvent) => {
    // Hides the drag handles if the cursor is no longer over the image.
    if (
      (!event.target ||
        !imageWrapper.contains(event.target as Node) ||
        !editor.isEditable) &&
      imageWrapper.contains(leftResizeHandle) &&
      imageWrapper.contains(rightResizeHandle)
    ) {
      imageWrapper.removeChild(leftResizeHandle);
      imageWrapper.removeChild(rightResizeHandle);
    }

    if (!resizeParams) {
      return;
    }

    resizeParams = undefined;

    editor.updateBlock(block, {
      type: "file",
      props: {
        previewWidth: image.width,
      },
    });
  };

  // Shows the resize handles when hovering over the image with the cursor.
  const imageMouseEnterHandler = () => {
    if (editor.isEditable) {
      imageWrapper.appendChild(leftResizeHandle);
      imageWrapper.appendChild(rightResizeHandle);
    }
  };
  // Hides the resize handles when the cursor leaves the image, unless the
  // cursor moves to one of the resize handles.
  const imageMouseLeaveHandler = (event: MouseEvent) => {
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
      imageWrapper.contains(leftResizeHandle) &&
      imageWrapper.contains(rightResizeHandle)
    ) {
      imageWrapper.removeChild(leftResizeHandle);
      imageWrapper.removeChild(rightResizeHandle);
    }
  };

  // Sets the resize params, allowing the user to begin resizing the image by
  // moving the cursor left or right.
  const leftResizeHandleMouseDownHandler = (event: MouseEvent) => {
    event.preventDefault();

    imageWrapper.appendChild(leftResizeHandle);
    imageWrapper.appendChild(rightResizeHandle);

    resizeParams = {
      handleUsed: "left",
      initialWidth: block.props.previewWidth,
      initialClientX: event.clientX,
    };
  };
  const rightResizeHandleMouseDownHandler = (event: MouseEvent) => {
    event.preventDefault();

    imageWrapper.appendChild(leftResizeHandle);
    imageWrapper.appendChild(rightResizeHandle);

    resizeParams = {
      handleUsed: "right",
      initialWidth: block.props.previewWidth,
      initialClientX: event.clientX,
    };
  };

  imageWrapper.appendChild(image);

  window.addEventListener("mousemove", windowMouseMoveHandler);
  window.addEventListener("mouseup", windowMouseUpHandler);
  image.addEventListener("mouseenter", imageMouseEnterHandler);
  image.addEventListener("mouseleave", imageMouseLeaveHandler);
  leftResizeHandle.addEventListener(
    "mousedown",
    leftResizeHandleMouseDownHandler
  );
  rightResizeHandle.addEventListener(
    "mousedown",
    rightResizeHandleMouseDownHandler
  );

  return {
    dom: imageWrapper,
    destroy: () => {
      window.removeEventListener("mousemove", windowMouseMoveHandler);
      window.removeEventListener("mouseup", windowMouseUpHandler);
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

const parseImageFile = (element: HTMLElement) => {
  if (element.tagName === "FIGURE") {
    const img = element.querySelector("img");
    const caption = element.querySelector("figcaption");
    return {
      fileType: "image",
      url: img?.src || undefined,
      caption: caption?.textContent ?? img?.alt,
      previewWidth: img?.width || undefined,
    };
  }

  if (element.tagName === "IMG") {
    return {
      fileType: "image",
      url: (element as HTMLImageElement).src || undefined,
      previewWidth: (element as HTMLImageElement).width || undefined,
    };
  }

  return undefined;
};

const imageFileToExternalHTML = (
  block: BlockFromConfig<typeof fileBlockConfig, any, any>
): { dom: HTMLElement } => {
  const image = document.createElement("img");
  image.src = block.props.url;
  image.width = block.props.previewWidth;
  image.alt = block.props.caption || "BlockNote image";

  if (block.props.caption) {
    const figure = document.createElement("figure");
    const caption = document.createElement("figcaption");
    caption.textContent = block.props.caption;

    figure.appendChild(image);
    figure.appendChild(caption);

    return {
      dom: figure,
    };
  }

  return {
    dom: image,
  };
};

export const imageFileExtension: FileBlockExtension = {
  fileEndings: [
    "apng",
    "avif",
    "gif",
    "jpg",
    "jpeg",
    "jfif",
    "pjpeg",
    "pjp",
    "svg",
    "webp",
  ],
  render: renderImageFile,
  toExternalHTML: imageFileToExternalHTML,
  parse: parseImageFile,
  buttonText: "image",
  buttonIcon: () => {
    const fileBlockImageIcon = document.createElement("div");
    fileBlockImageIcon.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M5 11.1005L7 9.1005L12.5 14.6005L16 11.1005L19 14.1005V5H5V11.1005ZM4 3H20C20.5523 3 21 3.44772 21 4V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V4C3 3.44772 3.44772 3 4 3ZM15.5 10C14.6716 10 14 9.32843 14 8.5C14 7.67157 14.6716 7 15.5 7C16.3284 7 17 7.67157 17 8.5C17 9.32843 16.3284 10 15.5 10Z"></path></svg>';

    return fileBlockImageIcon.firstElementChild as HTMLElement;
  },
};
