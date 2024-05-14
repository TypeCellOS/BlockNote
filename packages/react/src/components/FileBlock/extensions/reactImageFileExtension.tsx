import {
  BlockFromConfig,
  BlockNoteEditor,
  BlockSchemaWithBlock,
  DefaultBlockSchema,
  fileBlockConfig,
  imageParse,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { useCallback, useEffect, useState } from "react";
import { RiImage2Fill } from "react-icons/ri";

import { ReactFileBlockExtension } from "../reactFileBlockExtension";

const ImageRender = <
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema
>(props: {
  block: BlockFromConfig<DefaultBlockSchema["file"], ISchema, SSchema>;
  editor: BlockNoteEditor<
    BlockSchemaWithBlock<"file", DefaultBlockSchema["file"]>,
    ISchema,
    SSchema
  >;
}) => {
  const [width, setWidth] = useState<number>(props.block.props.previewWidth);
  const [imageHovered, setImageHovered] = useState<boolean>(false);
  const [resizeParams, setResizeParams] = useState<
    | {
        initialWidth: number;
        initialClientX: number;
        handleUsed: "left" | "right";
      }
    | undefined
  >(undefined);

  useEffect(() => {
    // Updates the image width with an updated width depending on the cursor X
    // offset from when the resize began, and which resize handle is being used.
    const windowMouseMoveHandler = (event: MouseEvent) => {
      if (!resizeParams) {
        return;
      }

      let newWidth: number;

      if (props.block.props.textAlignment === "center") {
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
        setWidth(minWidth);
      } else if (
        newWidth > props.editor.domElement.firstElementChild!.clientWidth
      ) {
        setWidth(props.editor.domElement.firstElementChild!.clientWidth);
      } else {
        setWidth(newWidth);
      }
    };
    // Stops mouse movements from resizing the image and updates the block's
    // `width` prop to the new value.
    const windowMouseUpHandler = () => {
      if (!resizeParams) {
        return;
      }

      setResizeParams(undefined);

      props.editor.updateBlock(props.block, {
        type: "file",
        props: {
          previewWidth: width,
        },
      });
    };

    window.addEventListener("mousemove", windowMouseMoveHandler);
    window.addEventListener("mouseup", windowMouseUpHandler);

    return () => {
      window.removeEventListener("mousemove", windowMouseMoveHandler);
      window.removeEventListener("mouseup", windowMouseUpHandler);
    };
  }, [props.block, props.editor, resizeParams, width]);

  // Shows the resize handles when hovering over the image with the cursor.
  const imageWrapperMouseEnterHandler = useCallback(() => {
    if (props.editor.isEditable) {
      setImageHovered(true);
    }
  }, [props.editor.isEditable]);

  // Hides the resize handles when the cursor leaves the image, unless the
  // cursor moves to one of the resize handles.
  const imageWrapperMouseLeaveHandler = useCallback(() => {
    setImageHovered(false);
  }, []);

  // Sets the resize params, allowing the user to begin resizing the image by
  // moving the cursor left or right.
  const leftResizeHandleMouseDownHandler = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();

      setResizeParams({
        handleUsed: "left",
        initialWidth: width,
        initialClientX: event.clientX,
      });
    },
    [width]
  );
  const rightResizeHandleMouseDownHandler = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();

      setResizeParams({
        handleUsed: "right",
        initialWidth: width,
        initialClientX: event.clientX,
      });
    },
    [width]
  );

  return (
    <div
      className={"bn-image-wrapper"}
      onMouseEnter={imageWrapperMouseEnterHandler}
      onMouseLeave={imageWrapperMouseLeaveHandler}>
      <img
        className={"bn-image"}
        src={props.block.props.url}
        alt={props.block.props.caption || "BlockNote image"}
        contentEditable={false}
        draggable={false}
        width={width}
      />
      {(imageHovered || resizeParams) && (
        <>
          <div
            className={"bn-image-resize-handle"}
            style={{ left: "4px" }}
            onMouseDown={leftResizeHandleMouseDownHandler}
          />
          <div
            className={"bn-image-resize-handle"}
            style={{ right: "4px" }}
            onMouseDown={rightResizeHandleMouseDownHandler}
          />
        </>
      )}
    </div>
  );
};

const ImageToExternalHTML = (props: {
  block: BlockFromConfig<typeof fileBlockConfig, any, any>;
}) => {
  const image = (
    <img
      src={props.block.props.url}
      alt={props.block.props.caption || "BlockNote image"}
      width={props.block.props.previewWidth}
    />
  );

  if (props.block.props.caption) {
    return (
      <figure>
        {image}
        <figcaption>{props.block.props.caption}</figcaption>
      </figure>
    );
  }

  return image;
};

export const reactImageFileExtension: ReactFileBlockExtension = {
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
  render: ImageRender,
  parse: imageParse,
  toExternalHTML: ImageToExternalHTML,
  buttonText: "image",
  buttonIcon: <RiImage2Fill size={24} />,
};
