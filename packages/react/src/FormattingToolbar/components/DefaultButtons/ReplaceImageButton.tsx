import { BlockNoteEditor, BlockSchema } from "@blocknote/core";
import { useEffect, useMemo, useState } from "react";
import { RiImageEditFill } from "react-icons/ri";
import Tippy from "@tippyjs/react";

import { ToolbarButton } from "../../../SharedComponents/Toolbar/components/ToolbarButton";
import { useSelectedBlocks } from "../../../hooks/useSelectedBlocks";
import { DefaultImageToolbar } from "../../../ImageToolbar/components/DefaultImageToolbar";

export const ReplaceImageButton = <BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>;
}) => {
  const selectedBlocks = useSelectedBlocks(props.editor);

  const [isOpen, setIsOpen] = useState<boolean>(false);

  useEffect(() => {
    setIsOpen(false);
  }, [selectedBlocks]);

  const show = useMemo(
    () =>
      // Checks if only one block is selected.
      selectedBlocks.length === 1 &&
      // Checks if the selected block is an image.
      selectedBlocks[0].type === "image",
    [selectedBlocks]
  );

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
