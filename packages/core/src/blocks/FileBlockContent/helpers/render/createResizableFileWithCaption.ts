import type { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import { BlockFromConfig, FileBlockConfig } from "../../../../schema/index.js";
import { createFileWithCaption } from "./createFileWithCaption.js";

export const createResizableFileWithCaption = (
  block: BlockFromConfig<FileBlockConfig, any, any>,
  editor: BlockNoteEditor<any, any, any>,
  element: HTMLElement,
  buttonText: string,
  buttonIcon: HTMLElement,
): { dom: HTMLElement; destroy: () => void } => {
  const { dom, destroy } = createFileWithCaption(
    block,
    editor,
    element,
    buttonText,
    buttonIcon,
  );
  const fileWithCaption = dom;
  if (block.props.url && block.props.showPreview) {
    if (block.props.previewWidth) {
      fileWithCaption.style.width = `${block.props.previewWidth}px`;
    } else {
      fileWithCaption.style.width = "fit-content";
    }
  }
  const file = fileWithCaption.querySelector(".bn-file") as HTMLElement;

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
  const windowMouseMoveHandler = (event: MouseEvent) => {
    if (!resizeParams) {
      if (
        !editor.isEditable &&
        file.contains(leftResizeHandle) &&
        file.contains(rightResizeHandle)
      ) {
        file.removeChild(leftResizeHandle);
        file.removeChild(rightResizeHandle);
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
    width = Math.min(
      Math.max(newWidth, minWidth),
      editor.domElement?.firstElementChild?.clientWidth || Number.MAX_VALUE,
    );
    fileWithCaption.style.width = `${width}px`;
  };
  // Stops mouse movements from resizing the element and updates the block's
  // `width` prop to the new value.
  const windowMouseUpHandler = (event: MouseEvent) => {
    // Hides the drag handles if the cursor is no longer over the element.
    if (
      (!event.target ||
        !file.contains(event.target as Node) ||
        !editor.isEditable) &&
      file.contains(leftResizeHandle) &&
      file.contains(rightResizeHandle)
    ) {
      file.removeChild(leftResizeHandle);
      file.removeChild(rightResizeHandle);
    }

    if (!resizeParams) {
      return;
    }

    resizeParams = undefined;

    if (file.contains(eventCaptureElement)) {
      file.removeChild(eventCaptureElement);
    }

    editor.updateBlock(block, {
      props: {
        previewWidth: width,
      },
    });
  };

  // Shows the resize handles when hovering over the wrapper with the cursor.
  const wrapperMouseEnterHandler = () => {
    if (resizeParams) {
      return;
    }

    if (editor.isEditable) {
      file.appendChild(leftResizeHandle);
      file.appendChild(rightResizeHandle);
    }
  };
  // Hides the resize handles when the cursor leaves the wrapper, unless the
  // cursor moves to one of the resize handles.
  const wrapperMouseLeaveHandler = (event: MouseEvent) => {
    if (
      resizeParams ||
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
      file.contains(leftResizeHandle) &&
      file.contains(rightResizeHandle)
    ) {
      file.removeChild(leftResizeHandle);
      file.removeChild(rightResizeHandle);
    }
  };

  // Sets the resize params, allowing the user to begin resizing the element by
  // moving the cursor left or right.
  const leftResizeHandleMouseDownHandler = (event: MouseEvent) => {
    event.preventDefault();

    if (!file.contains(eventCaptureElement)) {
      file.appendChild(eventCaptureElement);
    }

    resizeParams = {
      handleUsed: "left",
      initialWidth: fileWithCaption.clientWidth,
      initialClientX: event.clientX,
    };
  };
  const rightResizeHandleMouseDownHandler = (event: MouseEvent) => {
    event.preventDefault();

    if (!file.contains(eventCaptureElement)) {
      file.appendChild(eventCaptureElement);
    }

    resizeParams = {
      handleUsed: "right",
      initialWidth: fileWithCaption.clientWidth,
      initialClientX: event.clientX,
    };
  };

  window.addEventListener("mousemove", windowMouseMoveHandler);
  window.addEventListener("mouseup", windowMouseUpHandler);
  fileWithCaption.addEventListener("mouseenter", wrapperMouseEnterHandler);
  fileWithCaption.addEventListener("mouseleave", wrapperMouseLeaveHandler);
  leftResizeHandle.addEventListener(
    "mousedown",
    leftResizeHandleMouseDownHandler,
  );
  rightResizeHandle.addEventListener(
    "mousedown",
    rightResizeHandleMouseDownHandler,
  );

  return {
    dom: fileWithCaption,
    destroy: () => {
      destroy?.();
      window.removeEventListener("mousemove", windowMouseMoveHandler);
      window.removeEventListener("mouseup", windowMouseUpHandler);
      fileWithCaption.removeEventListener(
        "mouseenter",
        wrapperMouseEnterHandler,
      );
      fileWithCaption.removeEventListener(
        "mouseleave",
        wrapperMouseLeaveHandler,
      );
      leftResizeHandle.removeEventListener(
        "mousedown",
        leftResizeHandleMouseDownHandler,
      );
      rightResizeHandle.removeEventListener(
        "mousedown",
        rightResizeHandleMouseDownHandler,
      );
    },
  };
};
