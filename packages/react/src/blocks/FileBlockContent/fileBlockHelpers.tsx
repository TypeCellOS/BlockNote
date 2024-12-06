import { FileBlockConfig } from "@blocknote/core";
import {
  CSSProperties,
  forwardRef,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { RiFile2Line } from "react-icons/ri";

import { useUploadLoading } from "../../hooks/useUploadLoading.js";
import { useDictionary } from "../../i18n/dictionary.js";
import { ReactCustomBlockRenderProps } from "../../schema/ReactBlockSpec.js";

export const AddFileButton = (
  props: Omit<
    ReactCustomBlockRenderProps<FileBlockConfig, any, any>,
    "contentRef"
  > & {
    buttonText?: string;
    buttonIcon?: ReactNode;
  }
) => {
  const dict = useDictionary();

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
      <div className={"bn-add-file-button-text"}>
        {props.buttonText || dict.file_blocks.file.add_button_text}
      </div>
    </div>
  );
};

export const FileNameWithIcon = (
  props: Omit<
    ReactCustomBlockRenderProps<FileBlockConfig, any, any>,
    "editor" | "contentRef"
  >
) => (
  <div
    className={"bn-file-name-with-icon"}
    contentEditable={false}
    draggable={false}>
    <div className={"bn-file-icon"}>
      <RiFile2Line size={24} />
    </div>
    <p className={"bn-file-name"}>{props.block.props.name}</p>
  </div>
);

export const FileBlockWrapper = forwardRef<
  HTMLDivElement,
  Omit<ReactCustomBlockRenderProps<FileBlockConfig, any, any>, "contentRef"> & {
    buttonText?: string;
    buttonIcon?: ReactNode;
    children?: ReactNode;
  } & {
    // These props & the `forwardRef` are just here so we can reuse this
    // component in `ResizableFileBlockWrapper`.
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    style?: CSSProperties;
  }
>((props, ref) => {
  const showLoader = useUploadLoading(props.block.id);

  return (
    <div
      className={"bn-file-block-content-wrapper"}
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={props.onMouseLeave}
      style={props.style}
      ref={ref}>
      {showLoader ? (
        // Show loader while a file is being uploaded.
        <div className={"bn-file-loading-preview"}>Loading...</div>
      ) : props.block.props.url === "" ? (
        // Show the add file button if the file has not been uploaded yet.
        <AddFileButton {...props} />
      ) : (
        // Show the file preview and caption if the file has been uploaded.
        <>
          {props.block.props.showPreview === false || !props.children ? (
            // Use default preview.
            <FileNameWithIcon {...props} />
          ) : (
            // Use custom preview.
            props.children
          )}
          {props.block.props.caption && (
            <p className={"bn-file-caption"}>{props.block.props.caption}</p>
          )}
        </>
      )}
    </div>
  );
});

export const ResizableFileBlockWrapper = (
  props: Omit<
    ReactCustomBlockRenderProps<FileBlockConfig, any, any>,
    "contentRef"
  > & {
    buttonText?: string;
    buttonIcon?: ReactNode;
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
      }
      ref={ref}>
      <div className={"bn-visual-media-wrapper"}>
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
