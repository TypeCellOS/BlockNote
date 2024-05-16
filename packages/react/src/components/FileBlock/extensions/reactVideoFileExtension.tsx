import {
  BlockFromConfig,
  BlockNoteEditor,
  BlockSchemaWithBlock,
  DefaultBlockSchema,
  fileBlockConfig,
  videoParse,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { useState } from "react";
import { RiVideoFill } from "react-icons/ri";

import { ReactFileBlockExtension } from "../reactFileBlockExtension";
import { ResizeHandlesWrapper } from "./utils/ResizeHandlesWrapper";

const VideoRender = <
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
      <video
        className={"bn-visual-media"}
        src={props.block.props.url}
        contentEditable={false}
        controls={true}
        draggable={false}
        width={width}
      />
    </ResizeHandlesWrapper>
  );
};

const VideoToExternalHTML = (props: {
  block: BlockFromConfig<typeof fileBlockConfig, any, any>;
}) => {
  const video = (
    <video src={props.block.props.url} width={props.block.props.previewWidth} />
  );

  if (props.block.props.caption) {
    return (
      <figure>
        {video}
        <figcaption>{props.block.props.caption}</figcaption>
      </figure>
    );
  }

  return video;
};

export const reactVideoFileExtension: ReactFileBlockExtension = {
  fileEndings: ["mp4", "ogg", "webm"],
  render: VideoRender,
  parse: videoParse,
  toExternalHTML: VideoToExternalHTML,
  buttonText: "video",
  buttonIcon: <RiVideoFill size={24} />,
};
