import { createImageBlockConfig, imageParse } from "@blocknote/core";
import { RiImage2Fill } from "react-icons/ri";

import {
  createReactBlockSpec,
  ReactCustomBlockRenderProps,
} from "../../schema/ReactBlockSpec.js";
import { useResolveUrl } from "../File/useResolveUrl.js";
import { FigureWithCaption } from "../File/helpers/toExternalHTML/FigureWithCaption.js";
import { ResizableFileBlockWrapper } from "../File/helpers/render/ResizableFileBlockWrapper.js";
import { LinkWithCaption } from "../File/helpers/toExternalHTML/LinkWithCaption.js";

export const ImagePreview = (
  props: Omit<
    ReactCustomBlockRenderProps<
      ReturnType<typeof createImageBlockConfig>["type"],
      ReturnType<typeof createImageBlockConfig>["propSchema"],
      ReturnType<typeof createImageBlockConfig>["content"]
    >,
    "contentRef"
  >,
) => {
  const resolved = useResolveUrl(props.block.props.url!);

  return (
    <img
      className={"bn-visual-media"}
      src={
        resolved.loadingState === "loading"
          ? props.block.props.url
          : resolved.downloadUrl
      }
      alt={props.block.props.caption || "BlockNote image"}
      contentEditable={false}
      draggable={false}
    />
  );
};

export const ImageToExternalHTML = (
  props: Omit<
    ReactCustomBlockRenderProps<
      ReturnType<typeof createImageBlockConfig>["type"],
      ReturnType<typeof createImageBlockConfig>["propSchema"],
      ReturnType<typeof createImageBlockConfig>["content"]
    >,
    "contentRef"
  >,
) => {
  if (!props.block.props.url) {
    return <p>Add image</p>;
  }

  const image = props.block.props.showPreview ? (
    <img
      src={props.block.props.url}
      alt={
        props.block.props.name || props.block.props.caption || "BlockNote image"
      }
      width={props.block.props.previewWidth}
    />
  ) : (
    <a href={props.block.props.url}>
      {props.block.props.name || props.block.props.url}
    </a>
  );

  if (props.block.props.caption) {
    return props.block.props.showPreview ? (
      <FigureWithCaption caption={props.block.props.caption}>
        {image}
      </FigureWithCaption>
    ) : (
      <LinkWithCaption caption={props.block.props.caption}>
        {image}
      </LinkWithCaption>
    );
  }

  return image;
};

export const ImageBlock = (
  props: ReactCustomBlockRenderProps<
    ReturnType<typeof createImageBlockConfig>["type"],
    ReturnType<typeof createImageBlockConfig>["propSchema"],
    ReturnType<typeof createImageBlockConfig>["content"]
  >,
) => {
  return (
    <ResizableFileBlockWrapper
      {...(props as any)}
      buttonIcon={<RiImage2Fill size={24} />}
    >
      <ImagePreview {...(props as any)} />
    </ResizableFileBlockWrapper>
  );
};

export const ReactImageBlock = createReactBlockSpec(
  createImageBlockConfig,
  (config) => ({
    render: ImageBlock,
    parse: imageParse(config),
    toExternalHTML: ImageToExternalHTML,
  }),
);
