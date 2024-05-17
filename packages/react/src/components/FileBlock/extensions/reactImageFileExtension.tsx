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
import { useState } from "react";
import { RiImage2Fill } from "react-icons/ri";

import { ReactFileBlockExtension } from "../reactFileBlockExtension";
import { ResizeHandlesWrapper } from "./utils/ResizeHandlesWrapper";

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
  const [width, setWidth] = useState<number>(
    Math.min(
      props.block.props.previewWidth,
      props.editor.domElement.firstElementChild!.clientWidth
    )
  );

  return (
    <ResizeHandlesWrapper {...props} width={width} setWidth={setWidth}>
      <img
        className={"bn-visual-media"}
        src={props.block.props.url}
        alt={props.block.props.caption || "BlockNote image"}
        contentEditable={false}
        draggable={false}
        width={width}
      />
    </ResizeHandlesWrapper>
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