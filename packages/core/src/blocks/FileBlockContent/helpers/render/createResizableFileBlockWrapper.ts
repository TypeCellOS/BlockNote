import type { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import { BlockFromConfig, FileBlockConfig } from "../../../../schema/index.js";
import { createFileBlockWrapper } from "./createFileBlockWrapper.js";

export const createResizableFileBlockWrapper = (
  block: BlockFromConfig<FileBlockConfig, any, any>,
  editor: BlockNoteEditor<any, any, any>,
  element: { dom: HTMLElement; destroy?: () => void },
  resizeHandlesContainerElement: HTMLElement,
  buttonText: string,
  buttonIcon: HTMLElement
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
  let width = block.props.previewWidth! as number;

  // Updates the element width with an updated width depending on the cursor X
  // offset from when the resize began, and which resize handle is being used.
  const windowMouseMoveHandler = (event: MouseEvent) => {
    if (!resizeParams) {
      if (
        !editor.isEditable &&
        resizeHandlesContainerElement.contains(leftResizeHandle) &&
        resizeHandlesContainerElement.contains(rightResizeHandle)
      ) {
        resizeHandlesContainerElement.removeChild(leftResizeHandle);
        resizeHandlesContainerElement.removeChild(rightResizeHandle);
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
    width = Math.max(newWidth, minWidth);
    wrapper.style.width = `${width}px`;
  };
  // Stops mouse movements from resizing the element and updates the block's
  // `width` prop to the new value.
  const windowMouseUpHandler = (event: MouseEvent) => {
    // Hides the drag handles if the cursor is no longer over the element.
    if (
      (!event.target ||
        !wrapper.contains(event.target as Node) ||
        !editor.isEditable) &&
      resizeHandlesContainerElement.contains(leftResizeHandle) &&
      resizeHandlesContainerElement.contains(rightResizeHandle)
    ) {
      resizeHandlesContainerElement.removeChild(leftResizeHandle);
      resizeHandlesContainerElement.removeChild(rightResizeHandle);
    }

    if (!resizeParams) {
      return;
    }

    resizeParams = undefined;

    editor.updateBlock(block, {
      props: {
        previewWidth: width,
      },
    });
  };

  // Shows the resize handles when hovering over the wrapper with the cursor.
  const wrapperMouseEnterHandler = () => {
    if (editor.isEditable) {
      resizeHandlesContainerElement.appendChild(leftResizeHandle);
      resizeHandlesContainerElement.appendChild(rightResizeHandle);
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
      resizeHandlesContainerElement.contains(leftResizeHandle) &&
      resizeHandlesContainerElement.contains(rightResizeHandle)
    ) {
      resizeHandlesContainerElement.removeChild(leftResizeHandle);
      resizeHandlesContainerElement.removeChild(rightResizeHandle);
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
      destroy?.();
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
