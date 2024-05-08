import {
  BlockFromConfig,
  BlockNoteEditor,
  BlockSchemaWithBlock,
  DefaultBlockSchema,
  fileBlockConfig,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { FC, useCallback, useMemo } from "react";
import {
  createReactBlockSpec,
  ReactCustomBlockRenderProps,
} from "../../schema/ReactBlockSpec";
import {
  ReactFileBlockExtension,
  reactFileBlockImageExtension,
} from "./FileBlockExtensions";
import { RiFile2Line } from "react-icons/ri";

const DefaultFile = <
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

export const File = <
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
    () => activeExtension?.render || DefaultFile,
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
            {/* TODO */}
            {activeExtension?.buttonIcon || <RiFile2Line size={24} />}
          </div>
          <div className={"bn-add-file-button-text"}>{`Add ${
            activeExtension?.buttonText || "file"
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

export const createReactFileBlock = (
  extensions: Record<string, ReactFileBlockExtension> = {
    image: reactFileBlockImageExtension,
  }
) =>
  createReactBlockSpec(fileBlockConfig, {
    render: (props) => <File {...props} extensions={extensions} />,
  });
