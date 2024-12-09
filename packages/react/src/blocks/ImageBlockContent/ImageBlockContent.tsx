import { FileBlockConfig, imageBlockConfig, imageParse } from "@blocknote/core";
import { RiImage2Fill } from "react-icons/ri";

import {
  createReactBlockSpec,
  ReactCustomBlockRenderProps,
} from "../../schema/ReactBlockSpec.js";
import { useResolveUrl } from "../FileBlockContent/useResolveUrl.js";
import { FigureWithCaption } from "../FileBlockContent/helpers/toExternalHTML/FigureWithCaption.js";
import { ResizableFileBlockWrapper } from "../FileBlockContent/helpers/render/ResizableFileBlockWrapper.js";
import { LinkWithCaption } from "../FileBlockContent/helpers/toExternalHTML/LinkWithCaption.js";

export const ImagePreview = (
  props: Omit<
    ReactCustomBlockRenderProps<FileBlockConfig, any, any>,
    "contentRef"
  >
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
    ReactCustomBlockRenderProps<typeof imageBlockConfig, any, any>,
    "contentRef"
  >
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
  props: ReactCustomBlockRenderProps<typeof imageBlockConfig, any, any>
) => {
  return (
    <ResizableFileBlockWrapper
      {...(props as any)}
      buttonText={props.editor.dictionary.file_blocks.image.add_button_text}
      buttonIcon={<RiImage2Fill size={24} />}>
      <ImagePreview {...(props as any)} />
    </ResizableFileBlockWrapper>
  );
};

export const ReactImageBlock = createReactBlockSpec(imageBlockConfig, {
  render: ImageBlock,
  parse: imageParse,
  toExternalHTML: ImageToExternalHTML,
});
