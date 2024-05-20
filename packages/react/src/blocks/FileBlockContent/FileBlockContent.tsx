import { fileBlockConfig, fileParse } from "@blocknote/core";

import { RiFile2Line } from "react-icons/ri";
import {
  createReactBlockSpec,
  ReactCustomBlockRenderProps,
} from "../../schema/ReactBlockSpec";
import {
  AddFileButton,
  DefaultFilePreview,
  FileAndCaptionWrapper,
  LinkWithCaption,
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

  const link = (
    <a href={props.block.props.url}>
      {props.block.props.name || props.block.props.url}
    </a>
  );

  if (props.block.props.caption) {
    return (
      <LinkWithCaption caption={props.block.props.caption}>
        {link}
      </LinkWithCaption>
    );
  }

  return link;
};

export const ReactFileBlock = createReactBlockSpec(fileBlockConfig, {
  render: (props) => (
    <div className={"bn-file-block-content-wrapper"}>
      {props.block.props.url === "" ? (
        <AddFileButton
          block={props.block}
          editor={props.editor as any}
          buttonIcon={<RiFile2Line size={24} />}
          buttonText={props.editor.dictionary.file_blocks.file.add_button_text}
        />
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
