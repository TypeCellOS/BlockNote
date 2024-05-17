import {
  BlockFromConfig,
  BlockNoteEditor,
  BlockSchemaWithBlock,
  DefaultBlockSchema,
  fileBlockConfig,
  fileParse,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { RiFile2Line } from "react-icons/ri";

import { createReactBlockSpec } from "../../schema/ReactBlockSpec";
import { FileAndCaption, FileAndPlaceholder } from "./fileBlockHelpers";

export const DefaultFileRender = <
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema
>(props: {
  block: BlockFromConfig<DefaultBlockSchema["file"], ISchema, SSchema>;
  editor: BlockNoteEditor<
    BlockSchemaWithBlock<"file", DefaultBlockSchema["file"]>,
    ISchema,
    SSchema
  >;
}) => (
  <div
    className={"bn-file-default-preview"}
    contentEditable={false}
    draggable={false}>
    <RiFile2Line size={24} />
    {props.block.props.name}
  </div>
);

export const FileToExternalHTML = (props: {
  block: BlockFromConfig<typeof fileBlockConfig, any, any>;
  editor: BlockNoteEditor<
    BlockSchemaWithBlock<"file", typeof fileBlockConfig>,
    any,
    any
  >;
}) => {
  if (!props.block.props.url) {
    const buttonText = `${props.editor.dictionary.file.button_add_text} ${
      props.block.props.fileType &&
      props.extensions &&
      props.block.props.fileType in props.extensions &&
      props.extensions[props.block.props.fileType].buttonText !== undefined
        ? props.extensions[props.block.props.fileType].buttonText
        : props.editor.dictionary.file.button_default_file_type_text
    }`;

    return <p>{buttonText}</p>;
  }

  if (
    props.extensions &&
    props.block.props.fileType &&
    props.block.props.fileType in props.extensions &&
    props.extensions[props.block.props.fileType].toExternalHTML
  ) {
    const Component =
      props.extensions[props.block.props.fileType].toExternalHTML!;

    return <Component block={props.block} editor={props.editor} />;
  }

  const embed = (
    <embed
      src={props.block.props.url}
      type={props.block.props.fileType || undefined}
    />
  );

  if (props.block.props.caption) {
    return (
      <figure>
        {embed}
        <figcaption>{props.block.props.caption}</figcaption>
      </figure>
    );
  }

  return embed;
};

export const ReactFileBlock = createReactBlockSpec(fileBlockConfig, {
  render: (props) => (
    <div className={"bn-file-block-content-wrapper"}>
      {props.block.props.url === "" ? (
        <FileAndPlaceholder {...props} editor={props.editor as any} />
      ) : (
        <FileAndCaption {...props} editor={props.editor as any}>
          <DefaultFileRender block={props.block} editor={props.editor} />
        </FileAndCaption>
      )}
    </div>
  ),
  parse: (element) => fileParse(element),
  toExternalHTML: (props) => <FileToExternalHTML {...props} />,
});
