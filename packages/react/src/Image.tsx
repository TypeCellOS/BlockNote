// TODO: Vanilla version and move to core
import {
  BlockNoteEditor,
  BlockSchema,
  BlockSpec,
  defaultProps,
  PropSchema,
  SpecificBlock,
} from "@blocknote/core";

import Uppy, { UploadResult } from "@uppy/core";
import Tus from "@uppy/tus";
import GoogleDrive from "@uppy/google-drive";
import Url from "@uppy/url";
import { Dashboard } from "@uppy/react";

import { CSSProperties, useEffect, useMemo, useState } from "react";

import "@uppy/core/dist/style.css";
import "@uppy/dashboard/dist/style.css";
import "@uppy/drag-drop/dist/style.css";
import "@uppy/file-input/dist/style.css";
import "@uppy/progress-bar/dist/style.css";

import { createReactBlockSpec, InlineContent } from "./ReactBlockSpec";

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

// Max & min image widths as a fraction of the editor's width
const maxWidth = 1.0;
const minWidth = 0.1;

const imagePropSchema = {
  textAlignment: defaultProps.textAlignment,
  backgroundColor: defaultProps.backgroundColor,
  // Image src
  src: {
    // TODO: Better default
    default: "https://via.placeholder.com/150" as const,
  },
  // Image width as a fraction of the editor's width
  width: {
    default: "0.5" as const,
  },
  // Whether to show the image upload dashboard or not
  replacing: {
    default: "false" as const,
    values: ["true", "false"] as const,
  },
} satisfies PropSchema;

const ImageComponent = <Caption extends boolean>(props: {
  block: Caption extends true
    ? SpecificBlock<
        BlockSchema & {
          captionedImage: BlockSpec<
            "captionedImage",
            typeof imagePropSchema,
            Caption
          >;
        },
        "captionedImage"
      >
    : SpecificBlock<
        BlockSchema & {
          image: BlockSpec<"image", typeof imagePropSchema, Caption>;
        },
        "image"
      >;
  editor: Caption extends true
    ? BlockNoteEditor<
        BlockSchema & {
          captionedImage: BlockSpec<
            "captionedImage",
            typeof imagePropSchema,
            Caption
          >;
        }
      >
    : BlockNoteEditor<
        BlockSchema & {
          image: BlockSpec<"image", typeof imagePropSchema, Caption>;
        }
      >;
  caption: Caption;
}) => {
  // Used to check if the resizing handles should be shown.
  const [hovered, setHovered] = useState(false);

  // Used to check if the image is being resized, and which resize handle is
  // being used (left or right).
  const [resizeHandle, setResizeHandle] = useState<"left" | "right" | null>(
    null
  );

  // Used to calculate the new width while resizing the image, as the cursor X
  // offset is just added to the initial width. Both values are represented in
  // px.
  const [initialWidth, setInitialWidth] = useState(0);
  const [initialClientX, setInitialClientX] = useState(0);

  // The editor's width in px.
  const [editorWidth, setEditorWidth] = useState(
    props.editor.domElement.firstElementChild!.clientWidth
  );

  // The image width, represented as a fraction of the editor's width.
  const [width, setWidth] = useState(() => parseFloat(props.block.props.width));

  // Creates an Uppy instance for file uploading.
  // TODO: Server endpoints/URLs
  const [uppy] = useState(() =>
    new Uppy({ autoProceed: true, debug: true })
      .use(Tus, {
        endpoint: "https://master.tus.io/files/",
      })
      .use(GoogleDrive, {
        companionUrl: "https://companion.uppy.io",
      })
      .use(Url, {
        companionUrl: "https://companion.uppy.io",
      })
  );

  // Takes a width value in px, converts it to a fraction of the editor's
  // width, and updates the `width` state. Allows the image to be re-rendered
  // without having to update the block.
  const updateWidth = useMemo(
    () => (newWidth: number) => {
      newWidth = newWidth / editorWidth;

      if (newWidth < minWidth) {
        setWidth(minWidth);
      } else if (newWidth > maxWidth) {
        setWidth(maxWidth);
      } else {
        setWidth(newWidth);
      }
    },
    [editorWidth]
  );

  // Sets up listeners for when the image is being resized.
  useEffect(() => {
    // Stops mouse movements from resizing the image and updates the block's
    // `width` prop to the new value.
    const mouseUpHandler = () => {
      setResizeHandle(null);
      props.editor.updateBlock(props.block, {
        type: props.caption ? "captionedImage" : "image",
        props: {
          width: width.toString(),
        },
      });
    };
    // Re-renders the image with an updated width depending on the cursor
    // offset from when the resize began, and which resize handle is being used.
    const mouseMoveHandler = (e: MouseEvent) => {
      if (!resizeHandle) {
        return;
      }

      if (
        textAlignmentToAlignItems(props.block.props.textAlignment) === "center"
      ) {
        if (resizeHandle === "left") {
          updateWidth(initialWidth + (initialClientX - e.clientX) * 2);
        } else {
          updateWidth(initialWidth + (e.clientX - initialClientX) * 2);
        }
      } else {
        if (resizeHandle === "left") {
          updateWidth(initialWidth + initialClientX - e.clientX);
        } else {
          updateWidth(initialWidth + e.clientX - initialClientX);
        }
      }
    };
    // Re-renders the image when the viewport is resized. By storing the image
    // width as a fraction of the editor's width, this allows the image to
    // maintain its size relative to the editor.
    const resizeHandler = () => {
      setEditorWidth(props.editor.domElement.firstElementChild!.clientWidth);
    };

    window.addEventListener("mouseup", mouseUpHandler);
    window.addEventListener("mousemove", mouseMoveHandler);
    window.addEventListener("resize", resizeHandler);

    return () => {
      window.removeEventListener("mouseup", mouseUpHandler);
      window.removeEventListener("mousemove", mouseMoveHandler);
      window.removeEventListener("resize", resizeHandler);
    };
  }, [
    initialClientX,
    initialWidth,
    props.block,
    props.block.props.textAlignment,
    props.caption,
    props.editor,
    props.editor.domElement.firstElementChild,
    resizeHandle,
    updateWidth,
    width,
  ]);

  // Sets up handlers for when the image is replaced with a new one, uploaded
  // using Uppy.
  useEffect(() => {
    // Throws an error if the user tries to replace the image with more than one
    // file.
    const onUpload = (data: { id: string; fileIDs: string[] }) => {
      if (data.fileIDs.length > 1) {
        throw new Error("Only one file can be uploaded at a time");
      }
    };
    // Throws an error if the user tries to replace the image with more than one
    // file or if the upload fails. Otherwise, updates the block's `src` prop
    // with the uploaded image's URL.
    const onComplete = (result: UploadResult) => {
      if (result.successful.length + result.failed.length > 1) {
        throw new Error("Only one file can be uploaded at a time");
      }

      if (result.failed.length > 0) {
        throw new Error("Upload failed");
      }

      // Updating both `src` and `replacing` props at the same time causes some
      // kind of delay in rendering. While both the TipTap state and the DOM are
      // updated instantly, the image itself takes a while to display the new
      // source.
      props.editor.updateBlock(props.block, {
        type: props.caption ? "captionedImage" : "image",
        props: {
          src: result.successful[0].response!.uploadURL,
        },
      });
      setTimeout(() => {
        props.editor.updateBlock(props.block, {
          type: props.caption ? "captionedImage" : "image",
          props: {
            replacing: "false",
          },
        });
        uppy.cancelAll();
      }, 2000);
    };

    uppy.on("upload", onUpload);
    uppy.on("complete", onComplete);

    return () => {
      uppy.off("upload", onUpload);
      uppy.off("complete", onComplete);
    };
  }, [props.block, props.caption, props.editor, uppy]);

  return (
    // Wrapper element to set the image alignment
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: textAlignmentToAlignItems(props.block.props.textAlignment),
        width: "100%",
      }}>
      {/*Wrapper element for the image and resize handles*/}
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          position: "relative",
          width: "fit-content",
        }}>
        {/*Image element*/}
        {/*TODO: Alt text?*/}
        <img
          src={props.block.props.src}
          alt={"placeholder"}
          contentEditable={false}
          style={{
            display: props.block.props.replacing === "true" ? "none" : "block",
            width: `${width * editorWidth}px`,
          }}
        />
        {/*Image upload dashboard*/}
        <Dashboard
          id={props.block.id}
          uppy={uppy}
          plugins={["GoogleDrive", "Url"]}
          hideProgressAfterFinish={true}
          style={{
            display: props.block.props.replacing === "true" ? "block" : "none",
            width: `${Math.min(editorWidth, 750)}px`,
          }}
        />
        {/*Left resize handle*/}
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            setInitialWidth(width * editorWidth);
            setInitialClientX(e.clientX);
            setResizeHandle("left");
          }}
          style={{
            ...resizeHandleStyles,
            display:
              props.block.props.replacing === "false" &&
              (hovered || resizeHandle)
                ? "block"
                : "none",
            left: "4px",
          }}
        />
        {/*Right resize handle*/}
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            setInitialWidth(width * editorWidth);
            setInitialClientX(e.clientX);
            setResizeHandle("right");
          }}
          style={{
            ...resizeHandleStyles,
            display:
              props.block.props.replacing === "false" &&
              (hovered || resizeHandle)
                ? "block"
                : "none",
            right: "4px",
          }}
        />
      </div>
      {props.caption && (
        <InlineContent
          style={{
            width: `${editorWidth}px`,
          }}
        />
      )}
    </div>
  );
};

const resizeHandleStyles: CSSProperties = {
  position: "absolute",

  width: "8px",
  height: "30px",

  backgroundColor: "black",
  border: "1px solid white",
  borderRadius: "4px",

  cursor: "ew-resize",
};

export const Image = createReactBlockSpec<
  "image",
  typeof imagePropSchema,
  false,
  BlockSchema & {
    image: BlockSpec<"image", typeof imagePropSchema, false>;
  }
>({
  type: "image",
  propSchema: imagePropSchema,
  containsInlineContent: false,
  render: (props) => <ImageComponent {...props} caption={false} />,
});

export const CaptionedImage = createReactBlockSpec<
  "captionedImage",
  typeof imagePropSchema,
  true,
  BlockSchema & {
    captionedImage: BlockSpec<"captionedImage", typeof imagePropSchema, true>;
  }
>({
  type: "captionedImage",
  propSchema: imagePropSchema,
  containsInlineContent: true,
  render: (props) => <ImageComponent {...props} caption={true} />,
});
