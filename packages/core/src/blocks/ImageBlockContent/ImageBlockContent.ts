import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import { imageToolbarPluginKey } from "../../extensions/ImageToolbar/ImageToolbarPlugin";

import {
  BlockFromConfig,
  BlockSchemaWithBlock,
  CustomBlockConfig,
  InlineContentSchema,
  PropSchema,
  StyleSchema,
  createBlockSpec,
} from "../../schema";
import { defaultProps } from "../defaultProps";

export const imagePropSchema = {
  textAlignment: defaultProps.textAlignment,
  backgroundColor: defaultProps.backgroundColor,
  // Image url.
  url: {
    default: "" as const,
  },
  // Image caption.
  caption: {
    default: "" as const,
  },
  // Image width in px.
  width: {
    default: 512 as const,
  },
} satisfies PropSchema;

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

const blockConfig = {
  type: "image" as const,
  propSchema: imagePropSchema,
  content: "none",
} satisfies CustomBlockConfig;

export const renderImage = (
  block: BlockFromConfig<typeof blockConfig, InlineContentSchema, StyleSchema>,
  editor: BlockNoteEditor<BlockSchemaWithBlock<"image", typeof blockConfig>>
) => {
  // Wrapper element to set the image alignment, contains both image/image
  // upload dashboard and caption.
  const wrapper = document.createElement("div");
  wrapper.className = "bn-image-block-content-wrapper";
  wrapper.style.alignItems = textAlignmentToAlignItems(
    block.props.textAlignment
  );

  // Button element that acts as a placeholder for images with no src.
  const addImageButton = document.createElement("div");
  addImageButton.className = "bn-add-image-button";
  addImageButton.style.display = block.props.url === "" ? "" : "none";

  // Icon for the add image button.
  const addImageButtonIcon = document.createElement("div");
  addImageButtonIcon.className = "bn-add-image-button-icon";

  // Text for the add image button.
  const addImageButtonText = document.createElement("p");
  addImageButtonText.className = "bn-add-image-button-text";
  addImageButtonText.innerText = "Add Image";

  // Wrapper element for the image, resize handles and caption.
  const imageAndCaptionWrapper = document.createElement("div");
  imageAndCaptionWrapper.className = "bn-image-and-caption-wrapper";
  imageAndCaptionWrapper.style.display = block.props.url !== "" ? "" : "none";

  // Wrapper element for the image and resize handles.
  const imageWrapper = document.createElement("div");
  imageWrapper.className = "bn-image-wrapper";
  imageWrapper.style.display = block.props.url !== "" ? "" : "none";

  // Image element.
  const image = document.createElement("img");
  image.className = "bn-image";
  image.src = block.props.url;
  image.alt = "placeholder";
  image.contentEditable = "false";
  image.draggable = false;
  image.style.width = `${Math.min(
    block.props.width,
    editor.domElement.firstElementChild!.clientWidth
  )}px`;

  // Resize handle elements.
  const leftResizeHandle = document.createElement("div");
  leftResizeHandle.className = "bn-image-resize-handle";
  leftResizeHandle.style.left = "4px";
  const rightResizeHandle = document.createElement("div");
  rightResizeHandle.className = "bn-image-resize-handle";
  rightResizeHandle.style.right = "4px";

  // Caption element.
  const caption = document.createElement("p");
  caption.className = "bn-image-caption";
  caption.innerText = block.props.caption;
  caption.style.padding = block.props.caption ? "4px" : "";

  // Adds a light blue outline to selected image blocks.
  const handleEditorUpdate = () => {
    const selection = editor.getSelection()?.blocks || [];
    const currentBlock = editor.getTextCursorPosition().block;

    const isSelected =
      [currentBlock, ...selection].find(
        (selectedBlock) => selectedBlock.id === block.id
      ) !== undefined;

    if (isSelected) {
      addImageButton.style.outline = "4px solid rgb(100, 160, 255)";
      imageAndCaptionWrapper.style.outline = "4px solid rgb(100, 160, 255)";
    } else {
      addImageButton.style.outline = "";
      imageAndCaptionWrapper.style.outline = "";
    }
  };
  editor.onEditorContentChange(handleEditorUpdate);
  editor.onEditorSelectionChange(handleEditorUpdate);

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
    if (!resizeParams) {
      return;
    }

    // Hides the drag handles if the cursor is no longer over the image.
    if (
      (!event.target || !imageWrapper.contains(event.target as Node)) &&
      imageWrapper.contains(leftResizeHandle) &&
      imageWrapper.contains(rightResizeHandle)
    ) {
      leftResizeHandle.style.display = "none";
      rightResizeHandle.style.display = "none";
    }

    resizeParams = undefined;

    editor.updateBlock(block, {
      type: "image",
      props: {
        // Removes "px" from the end of the width string and converts to float.
        width: parseFloat(image.style.width.slice(0, -2)) as any,
      },
    });
  };

  // Prevents focus from moving to the button.
  const addImageButtonMouseDownHandler = (event: MouseEvent) => {
    event.preventDefault();
  };
  // Opens the image toolbar.
  const addImageButtonClickHandler = () => {
    editor._tiptapEditor.view.dispatch(
      editor._tiptapEditor.state.tr.setMeta(imageToolbarPluginKey, {
        block: block,
      })
    );
  };

  // Shows the resize handles when hovering over the image with the cursor.
  const imageMouseEnterHandler = () => {
    if (editor.isEditable) {
      leftResizeHandle.style.display = "block";
      rightResizeHandle.style.display = "block";
    } else {
      leftResizeHandle.style.display = "none";
      rightResizeHandle.style.display = "none";
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

    leftResizeHandle.style.display = "none";
    rightResizeHandle.style.display = "none";
  };

  // Sets the resize params, allowing the user to begin resizing the image by
  // moving the cursor left or right.
  const leftResizeHandleMouseDownHandler = (event: MouseEvent) => {
    event.preventDefault();

    leftResizeHandle.style.display = "block";
    rightResizeHandle.style.display = "block";

    resizeParams = {
      handleUsed: "left",
      initialWidth: block.props.width,
      initialClientX: event.clientX,
    };
  };
  const rightResizeHandleMouseDownHandler = (event: MouseEvent) => {
    event.preventDefault();

    leftResizeHandle.style.display = "block";
    rightResizeHandle.style.display = "block";

    resizeParams = {
      handleUsed: "right",
      initialWidth: block.props.width,
      initialClientX: event.clientX,
    };
  };

  wrapper.appendChild(addImageButton);
  addImageButton.appendChild(addImageButtonIcon);
  addImageButton.appendChild(addImageButtonText);
  wrapper.appendChild(imageAndCaptionWrapper);
  imageAndCaptionWrapper.appendChild(imageWrapper);
  imageWrapper.appendChild(image);
  imageWrapper.appendChild(leftResizeHandle);
  imageWrapper.appendChild(rightResizeHandle);
  imageAndCaptionWrapper.appendChild(caption);

  window.addEventListener("mousemove", windowMouseMoveHandler);
  window.addEventListener("mouseup", windowMouseUpHandler);
  addImageButton.addEventListener("mousedown", addImageButtonMouseDownHandler);
  addImageButton.addEventListener("click", addImageButtonClickHandler);
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
    dom: wrapper,
    destroy: () => {
      window.removeEventListener("mousemove", windowMouseMoveHandler);
      window.removeEventListener("mouseup", windowMouseUpHandler);
      addImageButton.removeEventListener(
        "mousedown",
        addImageButtonMouseDownHandler
      );
      addImageButton.removeEventListener("click", addImageButtonClickHandler);
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

export const Image = createBlockSpec(
  {
    type: "image" as const,
    propSchema: imagePropSchema,
    content: "none",
  },
  {
    render: renderImage,
    toExternalHTML: (block) => {
      if (block.props.url === "") {
        const div = document.createElement("p");
        div.innerHTML = "Add Image";

        return {
          dom: div,
        };
      }

      const figure = document.createElement("figure");

      const img = document.createElement("img");
      img.src = block.props.url;
      figure.appendChild(img);

      if (block.props.caption !== "") {
        const figcaption = document.createElement("figcaption");
        figcaption.innerHTML = block.props.caption;
        figure.appendChild(figcaption);
      }

      return {
        dom: figure,
      };
    },
    parse: (element: HTMLElement) => {
      if (element.tagName === "FIGURE") {
        const img = element.querySelector("img");
        const caption = element.querySelector("figcaption");
        return {
          url: img?.getAttribute("src") || "",
          caption:
            caption?.textContent || img?.getAttribute("alt") || undefined,
        };
      } else if (element.tagName === "IMG") {
        return {
          url: element.getAttribute("src") || "",
          caption: element.getAttribute("alt") || undefined,
        };
      }

      return undefined;
    },
  }
);
