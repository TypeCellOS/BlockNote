import { FileBlockConfig, audioBlockConfig, audioParse } from "@blocknote/core";
import { RiVolumeUpFill } from "react-icons/ri";

import {
  createReactBlockSpec,
  ReactCustomBlockRenderProps,
} from "../../schema/ReactBlockSpec";
import {
  FileAndCaptionWrapper,
  AddFileButton,
  DefaultFilePreview,
  FigureWithCaption,
} from "../FileBlockContent/fileBlockHelpers";

export const AudioPreview = (
  props: Omit<
    ReactCustomBlockRenderProps<FileBlockConfig, any, any>,
    "contentRef"
  >
) => (
  <audio
    className={"bn-audio"}
    src={props.block.props.url}
    controls={true}
    contentEditable={false}
    draggable={false}
  />
);

export const AudioToExternalHTML = (
  props: Omit<
    ReactCustomBlockRenderProps<typeof audioBlockConfig, any, any>,
    "contentRef"
  >
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

export const ReactAudioBlock = createReactBlockSpec(audioBlockConfig, {
  render: (props) => (
    <div className={"bn-file-block-content-wrapper"}>
      {props.block.props.url === "" ? (
        <AddFileButton
          {...props}
          editor={props.editor as any}
          buttonText={"Add audio"}
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
