import { BlockNoteEditor, BlockSchema } from "@blocknote/core";
import Tippy from "@tippyjs/react";
import { useEffect, useState } from "react";
import { RiImageEditFill } from "react-icons/ri";

import { DefaultImageToolbar } from "../../ImageToolbar/DefaultImageToolbar";
import { ToolbarButton } from "../../../components-shared/Toolbar/ToolbarButton";
import { useSelectedBlocks } from "../../../hooks/useSelectedBlocks";

export const ReplaceImageButton = <BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>;
}) => {
  const selectedBlocks = useSelectedBlocks(props.editor);

  const [isOpen, setIsOpen] = useState<boolean>(false);

  useEffect(() => {
    setIsOpen(false);
  }, [selectedBlocks]);

  const show =
    // Checks if only one block is selected.
    selectedBlocks.length === 1 &&
    // Checks if the selected block is an image.
    selectedBlocks[0].type === "image";

  if (!show) {
    return null;
  }

  return (
    <Tippy
      visible={isOpen}
      interactive={true}
      content={
        <DefaultImageToolbar
          block={selectedBlocks[0] as any}
          editor={props.editor}
        />
      }>
      <ToolbarButton
        onClick={() => setIsOpen(!isOpen)}
        isSelected={isOpen}
        mainTooltip={"Replace Image"}
        icon={RiImageEditFill}
      />
    </Tippy>
  );
};
