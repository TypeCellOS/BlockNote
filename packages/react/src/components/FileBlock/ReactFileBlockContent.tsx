import {
  BlockFromConfig,
  BlockNoteEditor,
  BlockSchemaWithBlock,
  DefaultBlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { FC, useCallback, useEffect, useMemo, useState } from "react";

const outline = "4px solid rgb(100, 160, 255)";

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

export const ReactFile = <
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema
>(props: {
  block: BlockFromConfig<DefaultBlockSchema["file"], ISchema, SSchema>;
  editor: BlockNoteEditor<
    BlockSchemaWithBlock<"file", DefaultBlockSchema["file"]>,
    ISchema,
    SSchema
  >;
}) => {
  const [isSelected, setIsSelected] = useState<boolean>(false);

  useEffect(() => {
    // Adds a light blue outline to selected file blocks.
    const handleEditorUpdate = () => {
      const selection = props.editor.getSelection()?.blocks || [];
      const currentBlock = props.editor.getTextCursorPosition().block;

      setIsSelected(
        [currentBlock, ...selection].find(
          (selectedBlock) => selectedBlock.id === props.block.id
        ) !== undefined
      );
    };

    props.editor.onEditorContentChange(handleEditorUpdate);
    props.editor.onEditorSelectionChange(handleEditorUpdate);
  }, [props.block.id, props.editor]);

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

  const FileComponent: FC<{
    block: BlockFromConfig<DefaultBlockSchema["file"], ISchema, SSchema>;
    editor: BlockNoteEditor<
      BlockSchemaWithBlock<"file", DefaultBlockSchema["file"]>,
      ISchema,
      SSchema
    >;
  }> = useMemo(() => {
    const fileExtension = props.block.props.url.split(".").pop();

    if (fileExtension && fileExtension in props.editor.renderFileExtension) {
      // TODO: Where should we pass/store `renderFileExtension` to minimize
      //  typing issues and convoluted code? Storing it in the editor is not
      //  good since the typing is vanilla/React specific.
      return props.editor.renderFileExtension[fileExtension] as any;
    }

    return DefaultFile;
  }, [props.block.props.url, props.editor.renderFileExtension]);

  return (
    <div className={"bn-file-block-content-wrapper"}>
      {props.block.props.url === "" ? (
        <div
          className={"bn-add-file-button"}
          onMouseDown={addFileButtonMouseDownHandler}
          onClick={addFileButtonClickHandler}
          style={{ outline: isSelected ? outline : undefined }}>
          <div className={"bn-add-file-button-icon"} />
          <div className={"bn-add-file-button-text"}>Add File</div>
        </div>
      ) : (
        <div
          className={"bn-file-and-caption-wrapper"}
          style={{ outline: isSelected ? outline : undefined }}>
          <FileComponent block={props.block} editor={props.editor} />
          <p
            className={"bn-file-caption"}
            style={{
              paddingBlock: props.block.props.caption ? "4px" : undefined,
            }}>
            {props.block.props.caption}
          </p>
        </div>
      )}
    </div>
  );
};
