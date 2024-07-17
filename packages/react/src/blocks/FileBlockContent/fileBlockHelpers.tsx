import { FileBlockConfig } from "@blocknote/core";
import { ReactNode, useCallback, useEffect, useState } from "react";
import { RiFile2Line } from "react-icons/ri";
import { ReactCustomBlockRenderProps } from "../../schema/ReactBlockSpec";

export const DefaultFilePreview = (
  props: Omit<
    ReactCustomBlockRenderProps<FileBlockConfig, any, any>,
    "contentRef"
  >
) => (
  <div
    className={"bn-file-default-preview"}
    contentEditable={false}
    draggable={false}>
    <div className={"bn-file-default-preview-icon"}>
      <RiFile2Line size={24} />
    </div>
    <p className={"bn-file-default-preview-name"}>{props.block.props.name}</p>
  </div>
);

export const FileAndCaptionWrapper = (
  props: Omit<
    ReactCustomBlockRenderProps<FileBlockConfig, any, any>,
    "contentRef"
  > & {
    children: ReactNode;
  }
) => {
  return (
    <div className={"bn-file-and-caption-wrapper"}>
      {props.children}
      {props.block.props.caption && (
        <p className={"bn-file-caption"}>{props.block.props.caption}</p>
      )}
    </div>
  );
};

export const AddFileButton = (
  props: Omit<
    ReactCustomBlockRenderProps<FileBlockConfig, any, any>,
    "contentRef"
  > & {
    buttonText: string;
    buttonIcon: ReactNode;
  }
) => {
  // Prevents focus from moving to the button.
  const addFileButtonMouseDownHandler = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
    },
    []
  );
  // Opens the file toolbar.
  const addFileButtonClickHandler = useCallback(() => {
    props.editor.dispatch(
      props.editor._tiptapEditor.state.tr.setMeta(
        props.editor.filePanel!.plugin,
        {
          block: props.block,
        }
      )
    );
  }, [props.block, props.editor]);

  return (
    <div
      className={"bn-add-file-button"}
      onMouseDown={addFileButtonMouseDownHandler}
      onClick={addFileButtonClickHandler}>
      <div className={"bn-add-file-button-icon"}>
        {props.buttonIcon || <RiFile2Line size={24} />}
      </div>
      <div className={"bn-add-file-button-text"}>{props.buttonText}</div>
    </div>
  );
};

export const LinkWithCaption = (props: {
  caption: string;
  children: ReactNode;
}) => (
  <div>
    {props.children}
    <p>{props.caption}</p>
  </div>
);

export const FigureWithCaption = (props: {
  caption: string;
  children: ReactNode;
}) => (
  <figure>
    {props.children}
    <figcaption>{props.caption}</figcaption>
  </figure>
);

export const ResizeHandlesWrapper = (
  props: Required<
    Omit<ReactCustomBlockRenderProps<FileBlockConfig, any, any>, "contentRef">
  > & {
    width: number;
    setWidth: (width: number) => void;
    children: ReactNode;
  }
) => {
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
      setResizeParams(undefined);

      (props.editor as any).updateBlock(props.block, {
        props: {
          previewWidth: props.width,
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
