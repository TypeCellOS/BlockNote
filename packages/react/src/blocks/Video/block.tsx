import { createVideoBlockConfig, videoParse } from "@blocknote/core";
import { RiVideoFill } from "react-icons/ri";

import {
  createReactBlockSpec,
  ReactCustomBlockRenderProps,
} from "../../schema/ReactBlockSpec.js";
import { useResolveUrl } from "../File/useResolveUrl.js";
import { FigureWithCaption } from "../File/helpers/toExternalHTML/FigureWithCaption.js";
import { ResizableFileBlockWrapper } from "../File/helpers/render/ResizableFileBlockWrapper.js";

export const VideoPreview = (
  props: Omit<
    ReactCustomBlockRenderProps<typeof createVideoBlockConfig>,
    "contentRef"
  >,
) => {
  const resolved = useResolveUrl(props.block.props.url!);

  return (
    <video
      className={"bn-visual-media"}
      src={
        resolved.loadingState === "loading"
          ? props.block.props.url
          : resolved.downloadUrl
      }
      controls={true}
      width={props.block.props.previewWidth || undefined}
      contentEditable={false}
      draggable={false}
    />
  );
};

export const VideoToExternalHTML = (
  props: Omit<
    ReactCustomBlockRenderProps<typeof createVideoBlockConfig>,
    "contentRef"
  >,
) => {
  if (!props.block.props.url) {
    return <p>Add video</p>;
  }

  const video = (
    <video
      src={props.block.props.url}
      width={props.block.props.previewWidth || undefined}
    />
  );

  if (props.block.props.caption) {
    return (
      <FigureWithCaption caption={props.block.props.caption}>
        {video}
      </FigureWithCaption>
    );
  }

  return video;
};

export const VideoBlock = (
  props: ReactCustomBlockRenderProps<typeof createVideoBlockConfig>,
) => {
  return (
    <ResizableFileBlockWrapper
      {...(props as any)}
      buttonIcon={<RiVideoFill size={24} />}
    >
      <VideoPreview {...(props as any)} />
    </ResizableFileBlockWrapper>
  );
};

export const ReactVideoBlock = createReactBlockSpec(
  createVideoBlockConfig,
  (config) => ({
    meta: {
      fileBlockAccept: ["video/*"],
    },
    render: VideoBlock,
    parse: videoParse(config),
    toExternalHTML: VideoToExternalHTML,
    runsBefore: ["file"],
  }),
);
