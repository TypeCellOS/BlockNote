import {
  BlockSchema,
  checkBlockIsFileBlock,
  checkBlockIsFileBlockWithPlaceholder,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import {
  ChangeEvent,
  KeyboardEvent,
  useCallback,
  useMemo,
  useState,
} from "react";
import { RiFontFamily } from "react-icons/ri";

import { useComponentsContext } from "../../../editor/ComponentsContext";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor";
import { useSelectedBlocks } from "../../../hooks/useSelectedBlocks";
import { useDictionary } from "../../../i18n/dictionary";

export const FileRenameButton = () => {
  const dict = useDictionary();
  const Components = useComponentsContext()!;

  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const [currentEditingName, setCurrentEditingName] = useState<string>();

  const selectedBlocks = useSelectedBlocks(editor);

  const fileBlock = useMemo(() => {
    // Checks if only one block is selected.
    if (selectedBlocks.length !== 1) {
      return undefined;
    }

    const block = selectedBlocks[0];

    if (checkBlockIsFileBlock(block, editor)) {
      setCurrentEditingName(block.props.name);
      return block;
    }

    return undefined;
  }, [editor, selectedBlocks]);

  const handleEnter = useCallback(
    (event: KeyboardEvent) => {
      if (fileBlock && event.key === "Enter") {
        event.preventDefault();
        editor.updateBlock(fileBlock, {
          props: {
            name: currentEditingName as any, // TODO
          },
        });
      }
    },
    [currentEditingName, editor, fileBlock]
  );

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) =>
      setCurrentEditingName(event.currentTarget.value),
    []
  );

  if (
    !fileBlock ||
    checkBlockIsFileBlockWithPlaceholder(fileBlock, editor) ||
    !editor.isEditable
  ) {
    return null;
  }

  return (
    <Components.Generic.Popover.Root>
      <Components.Generic.Popover.Trigger>
        <Components.FormattingToolbar.Button
          className={"bn-button"}
          label={
            dict.formatting_toolbar.file_rename.tooltip[fileBlock.type] ||
            dict.formatting_toolbar.file_rename.tooltip["file"]
          }
          mainTooltip={
            dict.formatting_toolbar.file_rename.tooltip[fileBlock.type] ||
            dict.formatting_toolbar.file_rename.tooltip["file"]
          }
          icon={<RiFontFamily />}
        />
      </Components.Generic.Popover.Trigger>
      <Components.Generic.Popover.Content
        className={"bn-popover-content bn-form-popover"}
        variant={"form-popover"}>
        <Components.Generic.Form.Root>
          <Components.Generic.Form.TextInput
            name={"file-name"}
            icon={<RiFontFamily />}
            value={currentEditingName || ""}
            autoFocus={true}
            placeholder={
              dict.formatting_toolbar.file_rename.input_placeholder[
                fileBlock.type
              ] || dict.formatting_toolbar.file_rename.input_placeholder["file"]
            }
            onKeyDown={handleEnter}
            onChange={handleChange}
          />
        </Components.Generic.Form.Root>
      </Components.Generic.Popover.Content>
    </Components.Generic.Popover.Root>
  );
};
