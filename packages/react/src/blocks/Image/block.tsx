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
    ReactCustomBlockRenderProps<typeof createImageBlockConfig>,
    "contentRef"
  >,
) => {
  const resolved = useResolveUrl(props.block.props.url!);

  // alt describes image content (per WCAG H86); figcaption (when present)
  // is the contextual caption. Fall back to "" so unlabelled images are
  // marked decorative rather than getting a noisy generic fallback.
  const alt = props.block.props.name || "";

  return (
    <img
      className={"bn-visual-media"}
      src={
        resolved.loadingState === "loading"
          ? props.block.props.url
          : resolved.downloadUrl
      }
      alt={alt}
      contentEditable={false}
      draggable={false}
    />
  );
};

export const ImageToExternalHTML = (
  props: Omit<
    ReactCustomBlockRenderProps<typeof createImageBlockConfig>,
    "contentRef"
  >,
) => {
  if (!props.block.props.url) {
    return <p>Add image</p>;
  }

  const alt = props.block.props.name || "";
  const image = props.block.props.showPreview ? (
    <img
      src={props.block.props.url}
      alt={alt}
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
  props: ReactCustomBlockRenderProps<typeof createImageBlockConfig>,
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
    meta: {
      fileBlockAccept: ["image/*"],
    },
    render: ImageBlock,
    parse: imageParse(config),
    toExternalHTML: ImageToExternalHTML,
    runsBefore: ["file"],
  }),
);
