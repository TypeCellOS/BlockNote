import { FileBlockConfig, videoBlockConfig, videoParse } from "@blocknote/core";
import { useRef } from "react";
import { RiVideoFill } from "react-icons/ri";

import {
  createReactBlockSpec,
  ReactCustomBlockRenderProps,
} from "../../schema/ReactBlockSpec.js";
import {
  FigureWithCaption,
  FileAndCaptionWrapper,
  FileBlockWrapper,
  LinkWithCaption,
  ResizeHandles,
  ResizeHandlesWrapper,
} from "../FileBlockContent/fileBlockHelpers.js";
import { useResolveUrl } from "../FileBlockContent/useResolveUrl.js";

export const VideoPreview = (
  props: Omit<
    ReactCustomBlockRenderProps<FileBlockConfig, any, any>,
    "contentRef"
  >
) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const resolved = useResolveUrl(props.block.props.url!);

  return (
    <ResizeHandlesWrapper {...props}>
      <FileAndCaptionWrapper {...props}>
        <div className={"bn-visual-media-wrapper"}>
          <video
            className={"bn-visual-media"}
            src={
              resolved.loadingState === "loading"
                ? props.block.props.url
                : resolved.downloadUrl
            }
            controls={true}
            contentEditable={false}
            draggable={false}
            ref={videoRef}
          />
          <ResizeHandles />
        </div>
      </FileAndCaptionWrapper>
    </ResizeHandlesWrapper>
  );
};

export const VideoToExternalHTML = (
  props: Omit<
    ReactCustomBlockRenderProps<typeof videoBlockConfig, any, any>,
    "contentRef"
  >
) => {
  if (!props.block.props.url) {
    return <p>Add video</p>;
  }

  const video = props.block.props.showPreview ? (
    <video src={props.block.props.url} />
  ) : (
    <a href={props.block.props.url}>
      {props.block.props.name || props.block.props.url}
    </a>
  );

  if (props.block.props.caption) {
    return props.block.props.showPreview ? (
      <FigureWithCaption caption={props.block.props.caption}>
        {video}
      </FigureWithCaption>
    ) : (
      <LinkWithCaption caption={props.block.props.caption}>
        {video}
      </LinkWithCaption>
    );
  }

  return video;
};

export const VideoBlock = (
  props: ReactCustomBlockRenderProps<typeof videoBlockConfig, any, any>
) => {
  return (
    <FileBlockWrapper
      {...(props as any)}
      buttonText={props.editor.dictionary.file_blocks.video.add_button_text}
      buttonIcon={<RiVideoFill size={24} />}>
      <VideoPreview block={props.block} editor={props.editor as any} />
    </FileBlockWrapper>
  );
};

export const ReactVideoBlock = createReactBlockSpec(videoBlockConfig, {
  render: VideoBlock,
  parse: videoParse,
  toExternalHTML: VideoToExternalHTML,
});
