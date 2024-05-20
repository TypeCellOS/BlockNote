import { FileBlockConfig, videoBlockConfig, videoParse } from "@blocknote/core";
import { useState } from "react";
import { RiVideoFill } from "react-icons/ri";

import {
  createReactBlockSpec,
  ReactCustomBlockRenderProps,
} from "../../schema/ReactBlockSpec";
import {
  FileAndCaptionWrapper,
  AddFileButton,
  ResizeHandlesWrapper,
  DefaultFilePreview,
  FigureWithCaption,
} from "../FileBlockContent/fileBlockHelpers";

export const VideoPreview = (
  props: Omit<
    ReactCustomBlockRenderProps<FileBlockConfig, any, any>,
    "contentRef"
  >
) => {
  const [width, setWidth] = useState<number>(
    Math.min(
      props.block.props.previewWidth!,
      props.editor.domElement.firstElementChild!.clientWidth
    )
  );

  return (
    <ResizeHandlesWrapper {...props} width={width} setWidth={setWidth}>
      <video
        className={"bn-visual-media"}
        src={props.block.props.url}
        controls={true}
        contentEditable={false}
        draggable={false}
        width={width}
      />
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

  const video = <video src={props.block.props.url} />;

  if (props.block.props.caption) {
    return (
      <FigureWithCaption caption={props.block.props.caption}>
        {video}
      </FigureWithCaption>
    );
  }

  return video;
};

export const ReactVideoBlock = createReactBlockSpec(videoBlockConfig, {
  render: (props) => (
    <div className={"bn-file-block-content-wrapper"}>
      {props.block.props.url === "" ? (
        <AddFileButton
          {...props}
          editor={props.editor as any}
          buttonText={"Add video"}
          buttonIcon={<RiVideoFill size={24} />}
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
          <VideoPreview block={props.block} editor={props.editor as any} />
        </FileAndCaptionWrapper>
      )}
    </div>
  ),
  parse: videoParse,
  toExternalHTML: (props) => <VideoToExternalHTML {...props} />,
});
