import {
  BlockFromConfig,
  BlockNoteEditor,
  FileBlockConfig,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { ReactNode, useCallback, useEffect, useState } from "react";

export const ResizeHandlesWrapper = <
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema
>(props: {
  block: BlockFromConfig<FileBlockConfig, ISchema, SSchema>;
  editor: BlockNoteEditor<
    any, // TODO: BlockSchemaWithBlock<"file", DefaultBlockSchema["file"]> ?
    ISchema,
    SSchema
  >;
  width: number;
  setWidth: (width: number) => void;
  children: ReactNode;
}) => {
  const [childHovered, setChildHovered] = useState<boolean>(false);
  const [resizeParams, setResizeParams] = useState<
    | {
        initialWidth: number;
        initialClientX: number;
        handleUsed: "left" | "right";
      }
    | undefined
  >(undefined);

  useEffect(() => {
    // Updates the child width with an updated width depending on the cursor X
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

      // Min child width in px.
      const minWidth = 64;

      // Ensures the child is not wider than the editor and not smaller than a
      // predetermined minimum width.
      if (newWidth < minWidth) {
        props.setWidth(minWidth);
      } else if (
        newWidth > props.editor.domElement.firstElementChild!.clientWidth
      ) {
        props.setWidth(props.editor.domElement.firstElementChild!.clientWidth);
      } else {
        props.setWidth(newWidth);
      }
    };
    // Stops mouse movements from resizing the child and updates the block's
    // `width` prop to the new value.
    const windowMouseUpHandler = () => {
      if (!resizeParams) {
        return;
      }

      setResizeParams(undefined);

      props.editor.updateBlock(props.block, {
        props: {
          previewWidth: props.width,
        },
      });
    };

    window.addEventListener("mousemove", windowMouseMoveHandler);
    window.addEventListener("mouseup", windowMouseUpHandler);

    return () => {
      window.removeEventListener("mousemove", windowMouseMoveHandler);
      window.removeEventListener("mouseup", windowMouseUpHandler);
    };
  }, [props, resizeParams]);

  // Shows the resize handles when hovering over the child with the cursor.
  const childWrapperMouseEnterHandler = useCallback(() => {
    if (props.editor.isEditable) {
      setChildHovered(true);
    }
  }, [props.editor.isEditable]);

  // Hides the resize handles when the cursor leaves the child, unless the
  // cursor moves to one of the resize handles.
  const childWrapperMouseLeaveHandler = useCallback(() => {
    setChildHovered(false);
  }, []);

  // Sets the resize params, allowing the user to begin resizing the child by
  // moving the cursor left or right.
  const leftResizeHandleMouseDownHandler = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();

      setResizeParams({
        handleUsed: "left",
        initialWidth: props.width,
        initialClientX: event.clientX,
      });
    },
    [props.width]
  );
  const rightResizeHandleMouseDownHandler = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();

      setResizeParams({
        handleUsed: "right",
        initialWidth: props.width,
        initialClientX: event.clientX,
      });
    },
    [props.width]
  );

  return (
    <div
      className={"bn-visual-media-wrapper"}
      onMouseEnter={childWrapperMouseEnterHandler}
      onMouseLeave={childWrapperMouseLeaveHandler}>
      {props.children}
      {(childHovered || resizeParams) && (
        <>
          <div
            className={"bn-visual-media-resize-handle"}
            style={{ left: "4px" }}
            onMouseDown={leftResizeHandleMouseDownHandler}
          />
          <div
            className={"bn-visual-media-resize-handle"}
            style={{ right: "4px" }}
            onMouseDown={rightResizeHandleMouseDownHandler}
          />
        </>
      )}
    </div>
  );
};
