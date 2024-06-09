import { FileBlockConfig, audioBlockConfig, audioParse } from "@blocknote/core";
import { RiVolumeUpFill } from "react-icons/ri";

import {
  ReactCustomBlockRenderProps,
  createReactBlockSpec,
} from "../../schema/ReactBlockSpec";
import {
  AddFileButton,
  DefaultFilePreview,
  FigureWithCaption,
  FileAndCaptionWrapper,
  LinkWithCaption,
} from "../FileBlockContent/fileBlockHelpers";
import { useResolveUrl } from "../FileBlockContent/useResolveUrl";

export const AudioPreview = (
  props: Omit<
    ReactCustomBlockRenderProps<FileBlockConfig, any, any>,
    "contentRef"
  >
) => {
  const resolved = useResolveUrl(props.block.props.url!);

  if (resolved.loadingState === "loading") {
    return null;
  }

  return (
    <audio
      className={"bn-audio"}
      src={resolved.downloadUrl}
      controls={true}
      contentEditable={false}
      draggable={false}
    />
  );
};

export const AudioToExternalHTML = (
  props: Omit<
    ReactCustomBlockRenderProps<typeof audioBlockConfig, any, any>,
    "contentRef"
  >
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

export const ReactAudioBlock = createReactBlockSpec(audioBlockConfig, {
  render: (props) => (
    <div className={"bn-file-block-content-wrapper"}>
      {props.block.props.url === "" ? (
        <AddFileButton
          {...props}
          editor={props.editor as any}
          buttonText={props.editor.dictionary.file_blocks.audio.add_button_text}
          buttonIcon={<RiVolumeUpFill size={24} />}
        />
      ) : !props.block.props.showPreview ? (
        <FileAndCaptionWrapper block={props.block} editor={props.editor as any}>
          <DefaultFilePreview
            block={props.block}
            editor={props.editor as any}
          />
        </FileAndCaptionWrapper>
      ) : (
        <FileAndCaptionWrapper block={props.block} editor={props.editor as any}>
          <AudioPreview block={props.block} editor={props.editor as any} />
        </FileAndCaptionWrapper>
      )}
    </div>
  ),
  parse: audioParse,
  toExternalHTML: (props) => <AudioToExternalHTML {...props} />,
});
