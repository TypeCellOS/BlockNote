import { FileBlockConfig, imageBlockConfig, imageParse } from "@blocknote/core";
import { useState } from "react";
import { RiImage2Fill } from "react-icons/ri";

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

export const ImagePreview = (
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
      <img
        className={"bn-visual-media"}
        src={props.block.props.url}
        alt={props.block.props.caption || "BlockNote image"}
        contentEditable={false}
        draggable={false}
        width={width}
      />
    </ResizeHandlesWrapper>
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

  const image = (
    <img
      src={props.block.props.url}
      alt={props.block.props.caption || "BlockNote image"}
    />
  );

  if (props.block.props.caption) {
    return (
      <FigureWithCaption caption={props.block.props.caption}>
        {image}
      </FigureWithCaption>
    );
  }

  return image;
};

export const ReactImageBlock = createReactBlockSpec(imageBlockConfig, {
  render: (props) => (
    <div className={"bn-file-block-content-wrapper"}>
      {props.block.props.url === "" ? (
        <AddFileButton
          {...props}
          editor={props.editor as any}
          buttonText={"Add image"}
          buttonIcon={<RiImage2Fill size={24} />}
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
          <ImagePreview block={props.block} editor={props.editor as any} />
        </FileAndCaptionWrapper>
      )}
    </div>
  ),
  parse: imageParse,
  toExternalHTML: (props) => <ImageToExternalHTML {...props} />,
});
