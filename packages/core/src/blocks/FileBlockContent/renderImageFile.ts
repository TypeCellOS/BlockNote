import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import { BlockFromConfig, BlockSchemaWithBlock } from "../../schema";
import { fileBlockConfig } from "./fileBlockConfig";

// Converts text alignment prop values to the flexbox `align-items` values.
const textAlignmentToAlignItems = (
  textAlignment: "left" | "center" | "right" | "justify"
): "flex-start" | "center" | "flex-end" => {
  switch (textAlignment) {
    case "left":
      return "flex-start";
    case "center":
      return "center";
    case "right":
      return "flex-end";
    default:
      return "flex-start";
  }
};

// Min image width in px.
const minWidth = 64;

export const renderImageFile = (
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
  image.alt = "placeholder";
  image.contentEditable = "false";
  image.draggable = false;
  image.style.width = `${Math.min(
    block.props.previewWidth,
    editor.domElement.firstElementChild!.clientWidth
  )}px`;

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

    if (textAlignmentToAlignItems(block.props.textAlignment) === "center") {
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

    // Ensures the image is not wider than the editor and not smaller than a
    // predetermined minimum width.
    if (newWidth < minWidth) {
      image.style.width = `${minWidth}px`;
    } else if (newWidth > editor.domElement.firstElementChild!.clientWidth) {
      image.style.width = `${
        editor.domElement.firstElementChild!.clientWidth
      }px`;
    } else {
      image.style.width = `${newWidth}px`;
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
        // Removes "px" from the end of the width string and converts to float.
        previewWidth: parseFloat(image.style.width.slice(0, -2)) as any,
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
