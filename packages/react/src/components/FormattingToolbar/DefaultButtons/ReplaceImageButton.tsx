import { BlockSchema, InlineContentSchema, StyleSchema } from "@blocknote/core";
import { Popover } from "@mantine/core";
import { useEffect, useState } from "react";
import { RiImageEditFill } from "react-icons/ri";

import { DefaultImageToolbar } from "../../ImageToolbar/DefaultImageToolbar";
import { ToolbarButton } from "../../../components-shared/Toolbar/ToolbarButton";
import { useSelectedBlocks } from "../../../hooks/useSelectedBlocks";
import { checkBlockIsImage } from "./ImageCaptionButton";
import { useBlockNoteEditor } from "../../../editor/BlockNoteContext";

export const ReplaceImageButton = () => {
  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const selectedBlocks = useSelectedBlocks(editor);

  const [isOpen, setIsOpen] = useState<boolean>(false);

  useEffect(() => {
    setIsOpen(false);
  }, [selectedBlocks]);

  const show =
    // Checks if only one block is selected.
    selectedBlocks.length === 1 &&
    // Checks if the selected block is an image.
    checkBlockIsImage(selectedBlocks[0], editor);

  if (!show) {
    return null;
  }

  return (
    <Popover withinPortal={false} opened={isOpen} position={"bottom"}>
      <Popover.Target>
        <ToolbarButton
          onClick={() => setIsOpen(!isOpen)}
          isSelected={isOpen}
          mainTooltip={"Replace Image"}
          icon={RiImageEditFill}
        />
      </Popover.Target>
      <Popover.Dropdown>
        <DefaultImageToolbar block={selectedBlocks[0]} />
      </Popover.Dropdown>
    </Popover>
  );
};
