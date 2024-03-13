import {
  Block,
  BlockSchema,
  checkBlockIsDefaultType,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { Popover } from "@mantine/core";
import { useEffect, useState } from "react";
import { RiImageEditFill } from "react-icons/ri";

import { useBlockNoteEditor } from "../../../../hooks/useBlockNoteEditor";
import { ImageToolbar } from "../../../ImageToolbar/mantine/ImageToolbar";
import { ToolbarButton } from "../../../mantine-shared/Toolbar/ToolbarButton";

export const ReplaceImageButton = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(props: {
  selectedBlocks: Block<BSchema, I, S>[];
}) => {
  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const [isOpen, setIsOpen] = useState<boolean>(false);

  useEffect(() => {
    setIsOpen(false);
  }, []);

  const block =
    props.selectedBlocks.length === 1 ? props.selectedBlocks[0] : undefined;

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
