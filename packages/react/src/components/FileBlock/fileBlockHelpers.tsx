import { FileBlockConfig } from "@blocknote/core";
import { useCallback } from "react";
import { RiFile2Line } from "react-icons/ri";
import { ReactCustomBlockRenderProps } from "../../schema/ReactBlockSpec";

export const FileAndCaption = (
  props: Omit<
    ReactCustomBlockRenderProps<FileBlockConfig, any, any>,
    "contentRef"
  > & {
    children: React.ReactNode;
  }
) => {
  return (
    <div className={"bn-file-and-caption-wrapper"}>
      {props.children}
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
  );
};

export const FileAndPlaceholder = (
  props: Omit<
    ReactCustomBlockRenderProps<FileBlockConfig, any, any>,
    "contentRef"
  >
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

  return (
    <div
      className={"bn-add-file-button"}
      onMouseDown={addFileButtonMouseDownHandler}
      onClick={addFileButtonClickHandler}>
      <div className={"bn-add-file-button-icon"}>
        {/* TODO: customizable */}
        <RiFile2Line size={24} />
        {/* {activeExtension?.buttonIcon || <RiFile2Line size={24} />} */}
      </div>
      <div className={"bn-add-file-button-text"}>
        {/* TODO: customizable */}
        {props.editor.dictionary.file.button_add_file_text}
      </div>
    </div>
  );
};
