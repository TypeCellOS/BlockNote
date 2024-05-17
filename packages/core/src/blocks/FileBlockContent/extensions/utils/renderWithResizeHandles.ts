import type { BlockNoteEditor } from "../../../../editor/BlockNoteEditor";
import { BlockFromConfig, BlockSchemaWithBlock } from "../../../../schema";
import { fileBlockConfig } from "../../fileBlockConfig";

export const renderWithResizeHandles = (
  block: BlockFromConfig<typeof fileBlockConfig, any, any>,
  editor: BlockNoteEditor<
    BlockSchemaWithBlock<"file", typeof fileBlockConfig>,
    any,
    any
  >,
  element: HTMLElement,
  getWidth: () => number,
  setWidth: (width: number) => void
): { dom: HTMLElement; destroy: () => void } => {
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
      initialWidth: block.props.previewWidth,
      initialClientX: event.clientX,
    };
  };
  const rightResizeHandleMouseDownHandler = (event: MouseEvent) => {
    event.preventDefault();

    wrapper.appendChild(leftResizeHandle);
    wrapper.appendChild(rightResizeHandle);

    resizeParams = {
      handleUsed: "right",
      initialWidth: block.props.previewWidth,
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
