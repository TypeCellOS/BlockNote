import {
  BlockSchema,
  checkBlockIsFileBlock,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { useEffect, useState } from "react";
import { RiImageEditFill } from "react-icons/ri";

import { useComponentsContext } from "../../../editor/ComponentsContext";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor";
import { useSelectedBlocks } from "../../../hooks/useSelectedBlocks";
import { useDictionary } from "../../../i18n/dictionary";
import { FilePanel } from "../../FilePanel/FilePanel";

export const FileReplaceButton = () => {
  const dict = useDictionary();
  const Components = useComponentsContext()!;

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
    !checkBlockIsFileBlock(block, editor) ||
    !editor.isEditable
  ) {
    return null;
  }

  return (
    <Components.Generic.Popover.Root opened={isOpen} position={"bottom"}>
      <Components.Generic.Popover.Trigger>
        <Components.FormattingToolbar.Button
          className={"bn-button"}
          onClick={() => setIsOpen(!isOpen)}
          isSelected={isOpen}
          mainTooltip={
            dict.formatting_toolbar.file_replace.tooltip[block.type] ||
            dict.formatting_toolbar.file_replace.tooltip["file"]
          }
          label={
            dict.formatting_toolbar.file_replace.tooltip[block.type] ||
            dict.formatting_toolbar.file_replace.tooltip["file"]
          }
          icon={<RiImageEditFill />}
        />
      </Components.Generic.Popover.Trigger>
      <Components.Generic.Popover.Content
        className={"bn-popover-content bn-panel-popover"}
        variant={"panel-popover"}>
        <FilePanel block={block as any} />
      </Components.Generic.Popover.Content>
    </Components.Generic.Popover.Root>
  );
};
