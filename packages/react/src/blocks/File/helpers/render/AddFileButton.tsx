import { FileBlockConfig } from "@blocknote/core";
import { ReactNode, useCallback } from "react";
import { RiFile2Line } from "react-icons/ri";

import { useDictionary } from "../../../../i18n/dictionary.js";
import { ReactCustomBlockRenderProps } from "../../../../schema/ReactBlockSpec.js";

export const AddFileButton = (
  props: Omit<
    ReactCustomBlockRenderProps<
      FileBlockConfig["type"],
      FileBlockConfig["propSchema"],
      FileBlockConfig["content"]
    >,
    "contentRef"
  > & {
    buttonIcon?: ReactNode;
  },
) => {
  const dict = useDictionary();

  // Prevents focus from moving to the button.
  const addFileButtonMouseDownHandler = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
    },
    [],
  );
  // Opens the file toolbar.
  const addFileButtonClickHandler = useCallback(() => {
    props.editor.transact((tr) =>
      tr.setMeta(props.editor.filePanel!.plugins[0], {
        block: props.block,
      }),
    );
  }, [props.block, props.editor]);

  return (
    <div
      className={"bn-add-file-button"}
      onMouseDown={addFileButtonMouseDownHandler}
      onClick={addFileButtonClickHandler}
    >
      <div className={"bn-add-file-button-icon"}>
        {props.buttonIcon || <RiFile2Line size={24} />}
      </div>
      <div className={"bn-add-file-button-text"}>
        {props.block.type in dict.file_blocks.add_button_text
          ? dict.file_blocks.add_button_text[props.block.type]
          : dict.file_blocks.add_button_text["file"]}
      </div>
    </div>
  );
};
