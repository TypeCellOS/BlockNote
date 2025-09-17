import { FileBlockConfig } from "@blocknote/core";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";

import { useUploadLoading } from "../../../../hooks/useUploadLoading.js";
import { ReactCustomBlockRenderProps } from "../../../../schema/ReactBlockSpec.js";
import { FileBlockWrapper } from "./FileBlockWrapper.js";

export const ResizableFileBlockWrapper = (
  props: Omit<
    ReactCustomBlockRenderProps<
      FileBlockConfig["type"],
      FileBlockConfig["propSchema"] & {
        showPreview?: { default: true };
        previewWidth?: { default: number };
        textAlignment?: { default: "left" };
      },
      FileBlockConfig["content"]
    >,
    "contentRef"
  > & {
    buttonIcon?: ReactNode;
    children?: ReactNode;
  },
) => {
  // Temporary parameters set when the user begins resizing the element, used to
  // calculate the new width of the element.
  const [resizeParams, setResizeParams] = useState<
    | {
        initialWidth: number;
        initialClientX: number;
        handleUsed: "left" | "right";
      }
    | undefined
  >(undefined);

  const [width, setWidth] = useState<number | undefined>(
    props.block.props.previewWidth,
  );
  const [hovered, setHovered] = useState<boolean>(false);

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Updates the child width with an updated width depending on the cursor X
    // offset from when the resize began, and which resize handle is being used.
    const windowMouseMoveHandler = (event: MouseEvent | TouchEvent) => {
      let newWidth: number;

      const clientX =
        "touches" in event ? event.touches[0].clientX : event.clientX;

      if (props.block.props.textAlignment === "center") {
        if (resizeParams!.handleUsed === "left") {
          newWidth =
            resizeParams!.initialWidth +
            (resizeParams!.initialClientX - clientX) * 2;
        } else {
          newWidth =
            resizeParams!.initialWidth +
            (clientX - resizeParams!.initialClientX) * 2;
        }
      } else {
        if (resizeParams!.handleUsed === "left") {
          newWidth =
            resizeParams!.initialWidth + resizeParams!.initialClientX - clientX;
        } else {
          newWidth =
            resizeParams!.initialWidth + clientX - resizeParams!.initialClientX;
        }
      }

      // Min child width in px.
      const minWidth = 64;

      // Ensures the child is not wider than the editor and not narrower than a
      // predetermined minimum width.
      setWidth(
        Math.min(
          Math.max(newWidth, minWidth),
          props.editor.domElement?.firstElementChild?.clientWidth ||
            Number.MAX_VALUE,
        ),
      );
    };
    // Stops mouse movements from resizing the child and updates the block's
    // `width` prop to the new value.
    const windowMouseUpHandler = () => {
      setResizeParams(undefined);

      (props.editor as any).updateBlock(props.block, {
        props: {
          previewWidth: width,
        },
      });
    };

    if (resizeParams) {
      window.addEventListener("mousemove", windowMouseMoveHandler);
      window.addEventListener("touchmove", windowMouseMoveHandler);
      window.addEventListener("mouseup", windowMouseUpHandler);
      window.addEventListener("touchend", windowMouseUpHandler);
    }

    return () => {
      window.removeEventListener("mousemove", windowMouseMoveHandler);
      window.removeEventListener("touchmove", windowMouseMoveHandler);
      window.removeEventListener("mouseup", windowMouseUpHandler);
      window.removeEventListener("touchend", windowMouseUpHandler);
    };
  }, [props, resizeParams, width]);

  // Shows the resize handles when hovering over the child with the cursor.
  const wrapperMouseEnterHandler = useCallback(() => {
    if (props.editor.isEditable) {
      setHovered(true);
    }
  }, [props.editor.isEditable]);

  // Hides the resize handles when the cursor leaves the child, unless the
  // cursor moves to one of the resize handles.
  const wrapperMouseLeaveHandler = useCallback(() => {
    setHovered(false);
  }, []);

  // Sets the resize params, allowing the user to begin resizing the child by
  // moving the cursor left or right.
  const leftResizeHandleMouseDownHandler = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      event.preventDefault();

      const clientX =
        "touches" in event ? event.touches[0].clientX : event.clientX;

      setResizeParams({
        handleUsed: "left",
        initialWidth: ref.current!.clientWidth,
        initialClientX: clientX,
      });
    },
    [],
  );
  const rightResizeHandleMouseDownHandler = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      event.preventDefault();

      const clientX =
        "touches" in event ? event.touches[0].clientX : event.clientX;

      setResizeParams({
        handleUsed: "right",
        initialWidth: ref.current!.clientWidth,
        initialClientX: clientX,
      });
    },
    [],
  );

  const showLoader = useUploadLoading(props.block.id);

  return (
    <FileBlockWrapper
      {...props}
      onMouseEnter={wrapperMouseEnterHandler}
      onMouseLeave={wrapperMouseLeaveHandler}
      style={
        props.block.props.url && !showLoader && props.block.props.showPreview
          ? {
              width: width ? `${width}px` : "fit-content",
            }
          : undefined
      }
    >
      <div
        className={"bn-visual-media-wrapper"}
        style={{ position: "relative" }}
        ref={ref}
      >
        {props.children}
        {(hovered || resizeParams) && (
          <>
            <div
              className={"bn-resize-handle"}
              style={{ left: "4px" }}
              onMouseDown={leftResizeHandleMouseDownHandler}
              onTouchStart={leftResizeHandleMouseDownHandler}
            />
            <div
              className={"bn-resize-handle"}
              style={{ right: "4px" }}
              onMouseDown={rightResizeHandleMouseDownHandler}
              onTouchStart={rightResizeHandleMouseDownHandler}
            />
          </>
        )}
        {/* This element ensures `mousemove` and `mouseup` events are captured
        while resizing when the cursor is over the wrapper content. This is
        because embeds are treated as separate HTML documents, so if the 
        content is an embed, the events will only fire within that document. */}
        {resizeParams && (
          <div
            style={{
              position: "absolute",
              height: "100%",
              width: "100%",
            }}
          />
        )}
      </div>
    </FileBlockWrapper>
  );
};
