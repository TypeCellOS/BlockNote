import {
  BlockSchema,
  checkBlockIsDefaultType,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { Popover } from "@mantine/core";
import { useEffect, useState } from "react";
import { RiFileEditFill } from "react-icons/ri";

import { useBlockNoteEditor } from "../../../../hooks/useBlockNoteEditor";
import { useSelectedBlocks } from "../../../../hooks/useSelectedBlocks";
import { FilePanel } from "../../../FilePanel/mantine/FilePanel";
import { ToolbarButton } from "../../../mantine-shared/Toolbar/ToolbarButton";

export const ReplaceFileButton = () => {
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
    block.type !== "file" ||
    !checkBlockIsDefaultType("file", block, editor)
  ) {
    return null;
  }

  return (
    <Popover withinPortal={false} opened={isOpen} position={"bottom"}>
      <Popover.Target>
        <ToolbarButton
          onClick={() => setIsOpen(!isOpen)}
          isSelected={isOpen}
          mainTooltip={"Replace File"}
          icon={RiFileEditFill}
        />
      </Popover.Target>
      <Popover.Dropdown>
        <FilePanel block={block} />
      </Popover.Dropdown>
    </Popover>
  );
};
