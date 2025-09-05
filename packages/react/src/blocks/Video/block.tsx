import { createVideoBlockConfig, videoParse } from "@blocknote/core";
import { RiVideoFill } from "react-icons/ri";

import {
  createReactBlockSpec,
  ReactCustomBlockRenderProps,
} from "../../schema/ReactBlockSpec.js";
import { useResolveUrl } from "../File/useResolveUrl.js";
import { FigureWithCaption } from "../File/helpers/toExternalHTML/FigureWithCaption.js";
import { ResizableFileBlockWrapper } from "../File/helpers/render/ResizableFileBlockWrapper.js";
import { LinkWithCaption } from "../File/helpers/toExternalHTML/LinkWithCaption.js";

export const VideoPreview = (
  props: Omit<
    ReactCustomBlockRenderProps<
      ReturnType<typeof createVideoBlockConfig>["type"],
      ReturnType<typeof createVideoBlockConfig>["propSchema"],
      ReturnType<typeof createVideoBlockConfig>["content"]
    >,
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
      contentEditable={false}
      draggable={false}
    />
  );
};

export const VideoToExternalHTML = (
  props: Omit<
    ReactCustomBlockRenderProps<
      ReturnType<typeof createVideoBlockConfig>["type"],
      ReturnType<typeof createVideoBlockConfig>["propSchema"],
      ReturnType<typeof createVideoBlockConfig>["content"]
    >,
    "contentRef"
  >,
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
  props: ReactCustomBlockRenderProps<
    ReturnType<typeof createVideoBlockConfig>["type"],
    ReturnType<typeof createVideoBlockConfig>["propSchema"],
    ReturnType<typeof createVideoBlockConfig>["content"]
  >,
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
    render: VideoBlock,
    parse: videoParse(config),
    toExternalHTML: VideoToExternalHTML,
  }),
);
