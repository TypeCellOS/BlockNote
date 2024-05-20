import { fileBlockConfig, fileParse } from "@blocknote/core";

import {
  createReactBlockSpec,
  ReactCustomBlockRenderProps,
} from "../../schema/ReactBlockSpec";
import {
  FileAndCaptionWrapper,
  AddFileButton,
  DefaultFilePreview,
} from "./fileBlockHelpers";

export const FileToExternalHTML = (
  props: Omit<
    ReactCustomBlockRenderProps<typeof fileBlockConfig, any, any>,
    "contentRef"
  >
) => {
  if (!props.block.props.url) {
    return <p>Add file</p>;
  }

  const link = <a href={props.block.props.url}>{props.block.props.name}</a>;

  if (props.block.props.caption) {
    return (
      <div>
        {link}
        <p>{props.block.props.caption}</p>
      </div>
    );
  }

  return link;
};

export const ReactFileBlock = createReactBlockSpec(fileBlockConfig, {
  render: (props) => (
    <div className={"bn-file-block-content-wrapper"}>
      {props.block.props.url === "" ? (
        <AddFileButton block={props.block} editor={props.editor as any} />
      ) : (
        <FileAndCaptionWrapper block={props.block} editor={props.editor as any}>
          <DefaultFilePreview
            block={props.block}
            editor={props.editor as any}
          />
        </FileAndCaptionWrapper>
      )}
    </div>
  ),
  parse: fileParse,
  toExternalHTML: (props) => <FileToExternalHTML {...props} />,
});
