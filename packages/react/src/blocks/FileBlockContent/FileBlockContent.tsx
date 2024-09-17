import { fileBlockConfig, fileParse } from "@blocknote/core";

import {
  createReactBlockSpec,
  ReactCustomBlockRenderProps,
} from "../../schema/ReactBlockSpec";
import {
  DefaultFilePreview,
  FileBlockWrapper,
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

export const FileBlock = (
  props: ReactCustomBlockRenderProps<typeof fileBlockConfig, any, any>
) => {
  return (
    <FileBlockWrapper {...(props as any)}>
      <DefaultFilePreview block={props.block} editor={props.editor as any} />
    </FileBlockWrapper>
  );
};

export const ReactFileBlock = createReactBlockSpec(fileBlockConfig, {
  render: FileBlock,
  parse: fileParse,
  toExternalHTML: FileToExternalHTML,
});
