import { createAudioBlockConfig, audioParse } from "@blocknote/core";

import { RiVolumeUpFill } from "react-icons/ri";

import {
  ReactCustomBlockRenderProps,
  createReactBlockSpec,
} from "../../schema/ReactBlockSpec.js";
import { useResolveUrl } from "../File/useResolveUrl.js";
import { FigureWithCaption } from "../File/helpers/toExternalHTML/FigureWithCaption.js";
import { FileBlockWrapper } from "../File/helpers/render/FileBlockWrapper.js";
import { LinkWithCaption } from "../File/helpers/toExternalHTML/LinkWithCaption.js";

export const AudioPreview = (
  props: Omit<
    ReactCustomBlockRenderProps<
      ReturnType<typeof createAudioBlockConfig>,
      any,
      any
    >,
    "contentRef"
  >,
) => {
  const resolved = useResolveUrl(props.block.props.url!);

  return (
    <audio
      className={"bn-audio"}
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

export const AudioToExternalHTML = (
  props: Omit<
    ReactCustomBlockRenderProps<
      ReturnType<typeof createAudioBlockConfig>,
      any,
      any
    >,
    "contentRef"
  >,
) => {
  if (!props.block.props.url) {
    return <p>Add audio</p>;
  }

  const audio = props.block.props.showPreview ? (
    <audio src={props.block.props.url} />
  ) : (
    <a href={props.block.props.url}>
      {props.block.props.name || props.block.props.url}
    </a>
  );

  if (props.block.props.caption) {
    return props.block.props.showPreview ? (
      <FigureWithCaption caption={props.block.props.caption}>
        {audio}
      </FigureWithCaption>
    ) : (
      <LinkWithCaption caption={props.block.props.caption}>
        {audio}
      </LinkWithCaption>
    );
  }

  return audio;
};

export const AudioBlock = (
  props: ReactCustomBlockRenderProps<
    ReturnType<typeof createAudioBlockConfig>,
    any,
    any
  >,
) => {
  return (
    <FileBlockWrapper
      {...(props as any)}
      buttonText={props.editor.dictionary.file_blocks.audio.add_button_text}
      buttonIcon={<RiVolumeUpFill size={24} />}
    >
      <AudioPreview {...(props as any)} />
    </FileBlockWrapper>
  );
};

export const ReactAudioBlock = createReactBlockSpec(
  createAudioBlockConfig,
).implementation({
  render: AudioBlock,
  parse: audioParse,
  toExternalHTML: AudioToExternalHTML,
});
