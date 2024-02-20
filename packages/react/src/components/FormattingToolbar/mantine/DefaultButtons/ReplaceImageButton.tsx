import {
  BlockSchema,
  checkBlockIsDefaultType,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { Popover } from "@mantine/core";
import { useEffect, useState } from "react";
import { RiImageEditFill } from "react-icons/ri";

import { useBlockNoteEditor } from "../../../../editor/BlockNoteContext";
import { useSelectedBlocks } from "../../../../hooks/useSelectedBlocks";
import { ToolbarButton } from "../../../../components-shared/Toolbar/ToolbarButton";
import { ImageToolbar } from "../../../ImageToolbar/mantine/ImageToolbar";

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

  const block = selectedBlocks.length === 1 ? selectedBlocks[0] : undefined;

  if (
    block === undefined ||
    block.type !== "image" ||
    !checkBlockIsDefaultType("image", block, editor)
  ) {
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
        <ImageToolbar block={block} />
      </Popover.Dropdown>
    </Popover>
  );
};
