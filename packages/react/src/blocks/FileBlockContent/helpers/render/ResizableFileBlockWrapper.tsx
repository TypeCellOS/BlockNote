import { FileBlockConfig } from "@blocknote/core";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";

import { useUploadLoading } from "../../../../hooks/useUploadLoading.js";
import { ReactCustomBlockRenderProps } from "../../../../schema/ReactBlockSpec.js";
import { FileBlockWrapper } from "./FileBlockWrapper.js";

export const ResizableFileBlockWrapper = (
  props: Omit<
    ReactCustomBlockRenderProps<FileBlockConfig, any, any>,
    "contentRef"
  > & {
    buttonText: string;
    buttonIcon: ReactNode;
    children: ReactNode;
  }
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

  const [width, setWidth] = useState(props.block.props.previewWidth! as number);
  const [hovered, setHovered] = useState<boolean>(false);

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Updates the child width with an updated width depending on the cursor X
    // offset from when the resize began, and which resize handle is being used.
    const windowMouseMoveHandler = (event: MouseEvent) => {
      let newWidth: number;

      if (props.block.props.textAlignment === "center") {
        if (resizeParams!.handleUsed === "left") {
          newWidth =
            resizeParams!.initialWidth +
            (resizeParams!.initialClientX - event.clientX) * 2;
        } else {
          newWidth =
            resizeParams!.initialWidth +
            (event.clientX - resizeParams!.initialClientX) * 2;
        }
      } else {
        if (resizeParams!.handleUsed === "left") {
          newWidth =
            resizeParams!.initialWidth +
            resizeParams!.initialClientX -
            event.clientX;
        } else {
          newWidth =
            resizeParams!.initialWidth +
            event.clientX -
            resizeParams!.initialClientX;
        }
      }

      // Min child width in px.
      const minWidth = 64;

      // Ensures the child is not wider than the editor and not narrower than a
      // predetermined minimum width.
      if (newWidth < minWidth) {
        setWidth(minWidth);
      } else {
        setWidth(newWidth);
      }
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
      window.addEventListener("mouseup", windowMouseUpHandler);
    }

    return () => {
      window.removeEventListener("mousemove", windowMouseMoveHandler);
      window.removeEventListener("mouseup", windowMouseUpHandler);
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
    (event: React.MouseEvent) => {
      event.preventDefault();

      setResizeParams({
        handleUsed: "left",
        initialWidth: ref.current!.clientWidth,
        initialClientX: event.clientX,
      });
    },
    []
  );
  const rightResizeHandleMouseDownHandler = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();

      setResizeParams({
        handleUsed: "right",
        initialWidth: ref.current!.clientWidth,
        initialClientX: event.clientX,
      });
    },
    []
  );

  const showLoader = useUploadLoading(props.block.id);

  return (
    <FileBlockWrapper
      {...props}
      onMouseEnter={wrapperMouseEnterHandler}
      onMouseLeave={wrapperMouseLeaveHandler}
      style={
        props.block.props.url && !showLoader && props.block.props.showPreview
          ? { width: `${width}px` }
          : undefined
      }>
      <div className={"bn-visual-media-wrapper"} ref={ref}>
        {props.children}
        {(hovered || resizeParams) && (
          <>
            <div
              className={"bn-resize-handle"}
              style={{ left: "4px" }}
              onMouseDown={leftResizeHandleMouseDownHandler}
            />
            <div
              className={"bn-resize-handle"}
              style={{ right: "4px" }}
              onMouseDown={rightResizeHandleMouseDownHandler}
            />
          </>
        )}
      </div>
    </FileBlockWrapper>
  );
};
