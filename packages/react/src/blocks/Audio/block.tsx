import { createAudioBlockConfig, audioParse } from "@blocknote/core";

import { RiVolumeUpFill } from "react-icons/ri";

import {
  ReactCustomBlockRenderProps,
  createReactBlockSpec,
} from "../../schema/ReactBlockSpec.js";
import { useResolveUrl } from "../File/useResolveUrl.js";
import { FigureWithCaption } from "../File/helpers/toExternalHTML/FigureWithCaption.js";
import { FileBlockWrapper } from "../File/helpers/render/FileBlockWrapper.js";

export const AudioPreview = (
  props: Omit<
    ReactCustomBlockRenderProps<typeof createAudioBlockConfig>,
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
    ReactCustomBlockRenderProps<typeof createAudioBlockConfig>,
    "contentRef"
  >,
) => {
  if (!props.block.props.url) {
    return <p>Add audio</p>;
  }

  const audio = <audio src={props.block.props.url} />;

  if (props.block.props.caption) {
    return (
      <FigureWithCaption caption={props.block.props.caption}>
        {audio}
      </FigureWithCaption>
    );
  }

  return audio;
};

export const AudioBlock = (
  props: ReactCustomBlockRenderProps<typeof createAudioBlockConfig>,
) => {
  return (
    <FileBlockWrapper
      {...(props as any)}
      buttonIcon={<RiVolumeUpFill size={24} />}
    >
      <AudioPreview {...(props as any)} />
    </FileBlockWrapper>
  );
};

export const ReactAudioBlock = createReactBlockSpec(
  createAudioBlockConfig,
  (config) => ({
    meta: {
      fileBlockAccept: ["audio/*"],
    },
    render: AudioBlock,
    parse: audioParse(config),
    toExternalHTML: AudioToExternalHTML,
    runsBefore: ["file"],
  }),
);
