import {
  BlockSchema,
  checkBlockIsDefaultType,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { useEffect, useState } from "react";
import { RiImageEditFill } from "react-icons/ri";

import { useComponentsContext } from "../../../editor/ComponentsContext";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor";
import { useSelectedBlocks } from "../../../hooks/useSelectedBlocks";
import { ImagePanel } from "../../ImagePanel/mantine/ImagePanel";

export const ReplaceImageButton = () => {
  const components = useComponentsContext()!;
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
    <components.Popover opened={isOpen} position={"bottom"}>
      <components.PopoverTrigger>
        <components.ToolbarButton
          onClick={() => setIsOpen(!isOpen)}
          isSelected={isOpen}
          mainTooltip={"Replace Image"}
          icon={<RiImageEditFill />}
        />
      </components.PopoverTrigger>
      <components.PopoverContent>
        <ImagePanel block={block} />
      </components.PopoverContent>
    </components.Popover>
  );
};
