import {
  BlockNoteEditor,
  BlockSchema,
  BlockSpec,
  createBlockSpec,
  defaultProps,
  PropSchema,
  SpecificBlock,
} from "../../../../../index";

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

// Sets generic styles for a resize handle, regardless of whether it's the
// left or right one.
const setResizeHandleStyles = (resizeHandle: HTMLDivElement) => {
  resizeHandle.style.position = "absolute";
  resizeHandle.style.width = "8px";
  resizeHandle.style.height = "30px";
  resizeHandle.style.backgroundColor = "black";
  resizeHandle.style.border = "1px solid white";
  resizeHandle.style.borderRadius = "4px";
  resizeHandle.style.cursor = "ew-resize";
};

// Max & min image widths as a percentage of the editor's width.
const maxPercentWidth = 1.0;
const minPercentWidth = 0.1;

const imagePropSchema = {
  textAlignment: defaultProps.textAlignment,
  backgroundColor: defaultProps.backgroundColor,
  // Image src.
  src: {
    // TODO: Better default
    default: "" as const,
  },
  // Image caption.
  caption: {
    default: "" as const,
  },
  // Image width as a percentage of the editor's width.
  width: {
    default: "0.5" as const,
  },
} satisfies PropSchema;

const renderImage = (
  block: SpecificBlock<
    BlockSchema & { image: BlockSpec<"image", typeof imagePropSchema, false> },
    "image"
  >,
  editor: BlockNoteEditor<
    BlockSchema & { image: BlockSpec<"image", typeof imagePropSchema, false> }
  >
) => {
  // Wrapper element to set the image alignment, contains both image/image
  // upload dashboard and caption.
  const wrapper = document.createElement("div");
  wrapper.id = "wrapper";
  wrapper.style.display = "flex";
  wrapper.style.flexDirection = "column";
  wrapper.style.alignItems = textAlignmentToAlignItems(
    block.props.textAlignment
  );
  wrapper.style.userSelect = "none";
  wrapper.style.width = "100%";

  // Button element that opens the image upload dashboard.
  const addImageButton = document.createElement("div");
  addImageButton.style.display = block.props.src === "" ? "flex" : "none";
  addImageButton.style.flexDirection = "row";
  addImageButton.style.alignItems = "center";
  addImageButton.style.gap = "8px";
  addImageButton.style.backgroundColor = "whitesmoke";
  addImageButton.style.borderRadius = "4px";
  addImageButton.style.cursor = "pointer";
  addImageButton.style.padding = "12px";

  const addImageButtonIcon = document.createElement("div");
  addImageButtonIcon.style.backgroundImage = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M20 5H4V19L13.2923 9.70649C13.6828 9.31595 14.3159 9.31591 14.7065 9.70641L20 15.0104V5ZM2 3.9934C2 3.44476 2.45531 3 2.9918 3H21.0082C21.556 3 22 3.44495 22 3.9934V20.0066C22 20.5552 21.5447 21 21.0082 21H2.9918C2.44405 21 2 20.5551 2 20.0066V3.9934ZM8 11C6.89543 11 6 10.1046 6 9C6 7.89543 6.89543 7 8 7C9.10457 7 10 7.89543 10 9C10 10.1046 9.10457 11 8 11Z'%3E%3C/path%3E%3C/svg%3E")`;
  addImageButtonIcon.style.width = "24px";
  addImageButtonIcon.style.height = "24px";

  const addImageButtonText = document.createElement("p");
  addImageButtonText.innerText = "Add Image";

  const imageAndCaptionWrapper = document.createElement("div");
  imageAndCaptionWrapper.style.display =
    block.props.src !== "" ? "flex" : "none";
  imageAndCaptionWrapper.style.flexDirection = "column";
  imageAndCaptionWrapper.style.borderRadius = "4px";

  // Wrapper element for the image and resize handles.
  const imageWrapper = document.createElement("div");
  imageWrapper.style.display = block.props.src !== "" ? "flex" : "none";
  imageWrapper.style.flexDirection = "row";
  imageWrapper.style.alignItems = "center";
  imageWrapper.style.position = "relative";
  imageWrapper.style.width = "fit-content";

  // Image element.
  const image = document.createElement("img");
  image.src = block.props.src;
  image.alt = "placeholder";
  image.contentEditable = "false";
  image.draggable = false;
  image.style.borderRadius = "4px";
  image.style.width = `${
    parseFloat(block.props.width) *
    editor.domElement.firstElementChild!.clientWidth
  }px`;

  // Resize handle elements.
  const leftResizeHandle = document.createElement("div");
  leftResizeHandle.style.left = "4px";
  setResizeHandleStyles(leftResizeHandle);
  const rightResizeHandle = document.createElement("div");
  rightResizeHandle.style.right = "4px";
  setResizeHandleStyles(rightResizeHandle);

  const caption = document.createElement("p");
  caption.innerText = block.props.caption;
  caption.style.fontSize = "0.8em";
  caption.style.padding = block.props.caption ? "4px" : "0";

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
      addImageButton.style.outline = "none";
      imageAndCaptionWrapper.style.outline = "none";
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

    if (
      newWidth <
      minPercentWidth * editor.domElement.firstElementChild!.clientWidth
    ) {
      image.style.width = `${
        minPercentWidth * editor.domElement.firstElementChild!.clientWidth
      }px`;
    } else if (
      newWidth >
      maxPercentWidth * editor.domElement.firstElementChild!.clientWidth
    ) {
      image.style.width = `${
        maxPercentWidth * editor.domElement.firstElementChild!.clientWidth
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

    const percentWidth =
      parseInt(image.style.width.slice(0, -2)) /
      editor.domElement.firstElementChild!.clientWidth;

    editor.updateBlock(block, {
      type: "image",
      props: {
        width: percentWidth.toString(),
      },
    });
  };
  // Updates the image width when the viewport is resized. By storing the image
  // width as a fraction of the editor's width, this allows the image to
  // maintain its size relative to the editor.
  const windowResizeHandler = () => {
    image.style.width = `${
      parseFloat(block.props.width) *
      editor.domElement.firstElementChild!.clientWidth
    }px`;
  };

  // Changes the add image button background color on hover.
  const addImageButtonMouseEnterHandler = () => {
    addImageButton.style.backgroundColor = "gainsboro";
  };
  const addImageButtonMouseLeaveHandler = () => {
    addImageButton.style.backgroundColor = "whitesmoke";
  };

  // Shows the resize handles when hovering over the image with the cursor.
  const imageMouseEnterHandler = () => {
    leftResizeHandle.style.display = "block";
    rightResizeHandle.style.display = "block";
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

    resizeParams = {
      handleUsed: "left",
      initialWidth:
        parseFloat(block.props.width) *
        editor.domElement.firstElementChild!.clientWidth,
      initialClientX: event.clientX,
    };
  };
  const rightResizeHandleMouseDownHandler = (event: MouseEvent) => {
    event.preventDefault();

    resizeParams = {
      handleUsed: "right",
      initialWidth:
        parseFloat(block.props.width) *
        editor.domElement.firstElementChild!.clientWidth,
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
  window.addEventListener("resize", windowResizeHandler);
  addImageButton.addEventListener(
    "mouseenter",
    addImageButtonMouseEnterHandler
  );
  addImageButton.addEventListener(
    "mouseleave",
    addImageButtonMouseLeaveHandler
  );
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
      window.removeEventListener("resize", windowResizeHandler);
      addImageButton.removeEventListener(
        "mouseenter",
        addImageButtonMouseEnterHandler
      );
      addImageButton.removeEventListener(
        "mouseleave",
        addImageButtonMouseLeaveHandler
      );
      image.removeEventListener("mouseenter", imageMouseEnterHandler);
      image.removeEventListener("mouseleave", imageMouseLeaveHandler);
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

export const Image = createBlockSpec({
  type: "image",
  propSchema: imagePropSchema,
  containsInlineContent: false,
  render: renderImage,
});
