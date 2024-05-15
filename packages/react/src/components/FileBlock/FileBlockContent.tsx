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
import { FC, useCallback, useMemo } from "react";
import { RiFile2Line } from "react-icons/ri";

import {
  createReactBlockSpec,
  ReactCustomBlockImplementation,
  ReactCustomBlockRenderProps,
} from "../../schema/ReactBlockSpec";
import { defaultReactFileExtensions } from "./extensions/defaultReactFileExtensions";
import { ReactFileBlockExtension } from "./reactFileBlockExtension";

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
  <div className={"bn-file"} contentEditable={false} draggable={false}>
    {props.block.props.url.split("/").pop()}
  </div>
);

export const FileRender = <
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema
>(
  props: Omit<
    ReactCustomBlockRenderProps<typeof fileBlockConfig, ISchema, SSchema>,
    "contentRef"
  > & {
    extensions: Record<string, ReactFileBlockExtension>;
  }
) => {
  // Prevents focus from moving to the button.
  const addFileButtonMouseDownHandler = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
    },
    []
  );
  // Opens the file toolbar.
  const addFileButtonClickHandler = useCallback(() => {
    props.editor._tiptapEditor.view.dispatch(
      props.editor._tiptapEditor.state.tr.setMeta(
        props.editor.filePanel!.plugin,
        {
          block: props.block,
        }
      )
    );
  }, [
    props.block,
    props.editor._tiptapEditor.state.tr,
    props.editor._tiptapEditor.view,
    props.editor.filePanel,
  ]);

  const activeExtension: ReactFileBlockExtension | undefined = useMemo(() => {
    if (
      props.block.props.fileType &&
      props.extensions &&
      props.block.props.fileType in props.extensions
    ) {
      return props.extensions[props.block.props.fileType];
    }

    return undefined;
  }, [props.block.props.fileType, props.extensions]);

  const FileComponent: FC<
    Omit<
      ReactCustomBlockRenderProps<typeof fileBlockConfig, ISchema, SSchema>,
      "contentRef"
    >
  > = useMemo(
    () => activeExtension?.render || DefaultFileRender,
    [activeExtension?.render]
  );

  return (
    <div className={"bn-file-block-content-wrapper"}>
      {props.block.props.url === "" ? (
        <div
          className={"bn-add-file-button"}
          onMouseDown={addFileButtonMouseDownHandler}
          onClick={addFileButtonClickHandler}>
          <div className={"bn-add-file-button-icon"}>
            {activeExtension?.buttonIcon || <RiFile2Line size={24} />}
          </div>
          <div className={"bn-add-file-button-text"}>{`${
            props.editor.dictionary.file.button_add_text
          } ${
            activeExtension?.buttonText ||
            props.editor.dictionary.file.button_default_file_type_text
          }`}</div>
        </div>
      ) : (
        <div className={"bn-file-and-caption-wrapper"}>
          <FileComponent block={props.block} editor={props.editor} />
          {props.block.props.caption && (
            <p
              className={"bn-file-caption"}
              style={{
                paddingBlock: props.block.props.caption ? "4px" : undefined,
              }}>
              {props.block.props.caption}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export const FileToExternalHTML = (props: {
  block: BlockFromConfig<typeof fileBlockConfig, any, any>;
  editor: BlockNoteEditor<
    BlockSchemaWithBlock<"file", typeof fileBlockConfig>,
    any,
    any
  >;
  extensions?: Record<
    string,
    Pick<ReactFileBlockExtension, "buttonText" | "toExternalHTML">
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

export const createReactFileBlockImplementation = (
  extensions: Record<
    string,
    ReactFileBlockExtension
  > = defaultReactFileExtensions
) =>
  ({
    render: (props) => <FileRender {...props} extensions={extensions} />,
    parse: (element) => fileParse(element, extensions),
    toExternalHTML: (props) => (
      <FileToExternalHTML {...props} extensions={extensions} />
    ),
  } satisfies ReactCustomBlockImplementation<typeof fileBlockConfig, any, any>);

export const createReactFileBlock = (
  extensions: Record<
    string,
    ReactFileBlockExtension
  > = defaultReactFileExtensions
) =>
  createReactBlockSpec(
    fileBlockConfig,
    createReactFileBlockImplementation(extensions)
  );
