import { FileBlockConfig } from "@blocknote/core";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { RiFile2Line } from "react-icons/ri";

import { useUploadLoading } from "../../hooks/useUploadLoading.js";
import { useDictionary } from "../../i18n/dictionary.js";
import { ReactCustomBlockRenderProps } from "../../schema/ReactBlockSpec.js";

export const FileBlockWrapper = (
  props: Omit<
    ReactCustomBlockRenderProps<FileBlockConfig, any, any>,
    "contentRef"
  > & { buttonText?: string; buttonIcon?: ReactNode; children: ReactNode }
) => {
  const showLoader = useUploadLoading(props.block.id);

  if (showLoader) {
    return <div className={"bn-file-loading-preview"}>Loading...</div>;
  }

  return (
    <div className={"bn-file-block-content-wrapper"}>
      {props.block.props.url === "" ? (
        <AddFileButton {...props} />
      ) : props.block.props.showPreview === false ? (
        <FileAndCaptionWrapper block={props.block} editor={props.editor as any}>
          <DefaultFilePreview
            block={props.block}
            editor={props.editor as any}
          />
        </FileAndCaptionWrapper>
      ) : (
        props.children
      )}
    </div>
  );
};

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
      <p className={"bn-file-caption"}>{props.block.props.caption}</p>
    </div>
  );
};

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

const ResizeHandlesContext = createContext<{
  show: boolean;
  leftResizeHandleMouseDownHandler: (event: React.MouseEvent) => void;
  rightResizeHandleMouseDownHandler: (event: React.MouseEvent) => void;
}>({
  show: false,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  leftResizeHandleMouseDownHandler: () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  rightResizeHandleMouseDownHandler: () => {},
});

export const ResizeHandlesWrapper = (
  props: Required<
    Omit<ReactCustomBlockRenderProps<FileBlockConfig, any, any>, "contentRef">
  > & {
    children: ReactNode;
  }
) => {
  const [width, setWidth] = useState(props.block.props.previewWidth! as number);
  const [childHovered, setChildHovered] = useState<boolean>(false);
  const [resizeParams, setResizeParams] = useState<
    | {
        initialWidth: number;
        initialClientX: number;
        handleUsed: "left" | "right";
      }
    | undefined
  >(undefined);

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

      // Ensures the child is not wider than the editor and not smaller than a
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

  return (
    <div
      className={"bn-resize-handles-wrapper"}
      onMouseEnter={childWrapperMouseEnterHandler}
      onMouseLeave={childWrapperMouseLeaveHandler}
      style={{ width: `${width}px` }}
      ref={ref}>
      <ResizeHandlesContext.Provider
        value={{
          show: !!(childHovered || resizeParams),
          leftResizeHandleMouseDownHandler,
          rightResizeHandleMouseDownHandler,
        }}>
        {props.children}
      </ResizeHandlesContext.Provider>
    </div>
  );
};

export const ResizeHandles = () => {
  const {
    show,
    leftResizeHandleMouseDownHandler,
    rightResizeHandleMouseDownHandler,
  } = useContext(ResizeHandlesContext);

  if (!show) {
    return null;
  }

  return (
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
  );
};
