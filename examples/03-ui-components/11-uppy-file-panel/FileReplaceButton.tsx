import {
  BlockSchema,
  checkBlockIsFileBlock,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import {
  useBlockNoteEditor,
  useComponentsContext,
  useDictionary,
  useSelectedBlocks,
} from "@blocknote/react";
import { useEffect, useState } from "react";

import { RiImageEditFill } from "react-icons/ri";
import { UppyFilePanel } from "./UppyFilePanel";

// Copied with minor changes from:
// https://github.com/TypeCellOS/BlockNote/blob/main/packages/react/src/components/FormattingToolbar/DefaultButtons/FileReplaceButton.tsx
// Opens Uppy file panel instead of the default one.
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
        {/* Replaces default file panel with our Uppy one. */}
        <UppyFilePanel block={block as any} />
      </Components.Generic.Popover.Content>
    </Components.Generic.Popover.Root>
  );
};
