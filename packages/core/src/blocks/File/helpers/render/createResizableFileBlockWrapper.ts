import type { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import {
  BlockConfig,
  BlockFromConfigNoChildren,
} from "../../../../schema/index.js";
import { createFileBlockWrapper } from "./createFileBlockWrapper.js";

export const createResizableFileBlockWrapper = (
  block: BlockFromConfigNoChildren<
    BlockConfig<
      string,
      {
        backgroundColor: { default: "default" };
        name: { default: "" };
        url: { default: "" };
        caption: { default: "" };
        showPreview?: { default: true };
        previewWidth?: { default: number };
        textAlignment?: { default: "left" };
      },
      "none"
    >,
    any,
    any
  >,
  editor: BlockNoteEditor<any, any, any>,
  element: { dom: HTMLElement; destroy?: () => void },
  resizeHandlesContainerElement: HTMLElement,
  buttonIcon?: HTMLElement,
): { dom: HTMLElement; destroy: () => void } => {
  const { dom, destroy } = createFileBlockWrapper(
    block,
    editor,
    element,
    buttonIcon,
  );
  const wrapper = dom;
  wrapper.style.position = "relative";
  if (block.props.url && block.props.showPreview) {
    if (block.props.previewWidth) {
      wrapper.style.width = `${block.props.previewWidth}px`;
    } else {
      wrapper.style.width = "fit-content";
    }
  }

  const leftResizeHandle = document.createElement("div");
  leftResizeHandle.className = "bn-resize-handle";
  leftResizeHandle.style.left = "4px";
  const rightResizeHandle = document.createElement("div");
  rightResizeHandle.className = "bn-resize-handle";
  rightResizeHandle.style.right = "4px";

  // This element ensures `mousemove` and `mouseup` events are captured while
  // resizing when the cursor is over the wrapper content. This is because
  // embeds are treated as separate HTML documents, so if the content is an
  // embed, the events will only fire within that document.
  const eventCaptureElement = document.createElement("div");
  eventCaptureElement.style.position = "absolute";
  eventCaptureElement.style.height = "100%";
  eventCaptureElement.style.width = "100%";

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
  const windowMouseMoveHandler = (event: MouseEvent | TouchEvent) => {
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

    const clientX =
      "touches" in event ? event.touches[0].clientX : event.clientX;

    if (block.props.textAlignment === "center") {
      if (resizeParams.handleUsed === "left") {
        newWidth =
          resizeParams.initialWidth +
          (resizeParams.initialClientX - clientX) * 2;
      } else {
        newWidth =
          resizeParams.initialWidth +
          (clientX - resizeParams.initialClientX) * 2;
      }
    } else {
      if (resizeParams.handleUsed === "left") {
        newWidth =
          resizeParams.initialWidth + resizeParams.initialClientX - clientX;
      } else {
        newWidth =
          resizeParams.initialWidth + clientX - resizeParams.initialClientX;
      }
    }

    // Min element width in px.
    const minWidth = 64;

    // Ensures the element is not wider than the editor and not narrower than a
    // predetermined minimum width.
    width = Math.min(
      Math.max(newWidth, minWidth),
      editor.domElement?.firstElementChild?.clientWidth || Number.MAX_VALUE,
    );
    wrapper.style.width = `${width}px`;
  };
  // Stops mouse movements from resizing the element and updates the block's
  // `width` prop to the new value.
  const windowMouseUpHandler = (event: MouseEvent | TouchEvent) => {
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

    if (wrapper.contains(eventCaptureElement)) {
      wrapper.removeChild(eventCaptureElement);
    }

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
  const leftResizeHandleMouseDownHandler = (event: MouseEvent | TouchEvent) => {
    event.preventDefault();

    if (!wrapper.contains(eventCaptureElement)) {
      wrapper.appendChild(eventCaptureElement);
    }

    const clientX =
      "touches" in event ? event.touches[0].clientX : event.clientX;

    resizeParams = {
      handleUsed: "left",
      initialWidth: wrapper.clientWidth,
      initialClientX: clientX,
    };
  };
  const rightResizeHandleMouseDownHandler = (
    event: MouseEvent | TouchEvent,
  ) => {
    event.preventDefault();

    if (!wrapper.contains(eventCaptureElement)) {
      wrapper.appendChild(eventCaptureElement);
    }

    const clientX =
      "touches" in event ? event.touches[0].clientX : event.clientX;

    resizeParams = {
      handleUsed: "right",
      initialWidth: wrapper.clientWidth,
      initialClientX: clientX,
    };
  };

  window.addEventListener("mousemove", windowMouseMoveHandler);
  window.addEventListener("touchmove", windowMouseMoveHandler);
  window.addEventListener("mouseup", windowMouseUpHandler);
  window.addEventListener("touchend", windowMouseUpHandler);
  wrapper.addEventListener("mouseenter", wrapperMouseEnterHandler);
  wrapper.addEventListener("mouseleave", wrapperMouseLeaveHandler);
  leftResizeHandle.addEventListener(
    "mousedown",
    leftResizeHandleMouseDownHandler,
  );
  leftResizeHandle.addEventListener(
    "touchstart",
    leftResizeHandleMouseDownHandler,
  );
  rightResizeHandle.addEventListener(
    "mousedown",
    rightResizeHandleMouseDownHandler,
  );
  rightResizeHandle.addEventListener(
    "touchstart",
    rightResizeHandleMouseDownHandler,
  );

  return {
    dom: wrapper,
    destroy: () => {
      destroy?.();
      window.removeEventListener("mousemove", windowMouseMoveHandler);
      window.removeEventListener("touchmove", windowMouseMoveHandler);
      window.removeEventListener("mouseup", windowMouseUpHandler);
      window.removeEventListener("touchend", windowMouseUpHandler);
      wrapper.removeEventListener("mouseenter", wrapperMouseEnterHandler);
      wrapper.removeEventListener("mouseleave", wrapperMouseLeaveHandler);
      leftResizeHandle.removeEventListener(
        "mousedown",
        leftResizeHandleMouseDownHandler,
      );
      leftResizeHandle.removeEventListener(
        "touchstart",
        leftResizeHandleMouseDownHandler,
      );
      rightResizeHandle.removeEventListener(
        "mousedown",
        rightResizeHandleMouseDownHandler,
      );
      rightResizeHandle.removeEventListener(
        "touchstart",
        rightResizeHandleMouseDownHandler,
      );
    },
  };
};
