import {
  blockHasType,
  BlockSchema,
  editorHasBlockWithType,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import {
  ChangeEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { RiFontFamily } from "react-icons/ri";

import { useComponentsContext } from "../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor.js";
import { useEditorState } from "../../../hooks/useEditorState.js";
import { useDictionary } from "../../../i18n/dictionary.js";

export const FileRenameButton = () => {
  const dict = useDictionary();
  const Components = useComponentsContext()!;

  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const block = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (!editor.isEditable) {
        return undefined;
      }

      const selectedBlocks = editor.getSelection()?.blocks || [
        editor.getTextCursorPosition().block,
      ];

      if (selectedBlocks.length !== 1) {
        return undefined;
      }

      const block = selectedBlocks[0];

      if (
        !blockHasType(block, editor, block.type, {
          url: "string",
          name: "string",
        })
      ) {
        return undefined;
      }

      return block;
    },
  });

  const [currentEditingName, setCurrentEditingName] = useState<string>();

  useEffect(() => {
    if (block === undefined) {
      return;
    }

    setCurrentEditingName(block.props.name);
  }, [block]);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) =>
      setCurrentEditingName(event.currentTarget.value),
    [],
  );

  const handleEnter = useCallback(
    (event: KeyboardEvent) => {
      if (
        block !== undefined &&
        editorHasBlockWithType(editor, block.type, {
          name: "string",
        }) &&
        event.key === "Enter"
      ) {
        event.preventDefault();
        editor.updateBlock(block.id, {
          props: {
            name: currentEditingName,
          },
        });
      }
    },
    [block, currentEditingName, editor],
  );

  if (block === undefined) {
    return null;
  }

  return (
    <Components.Generic.Popover.Root>
      <Components.Generic.Popover.Trigger>
        <Components.FormattingToolbar.Button
          className={"bn-button"}
          label={
            dict.formatting_toolbar.file_rename.tooltip[block.type] ||
            dict.formatting_toolbar.file_rename.tooltip["file"]
          }
          mainTooltip={
            dict.formatting_toolbar.file_rename.tooltip[block.type] ||
            dict.formatting_toolbar.file_rename.tooltip["file"]
          }
          icon={<RiFontFamily />}
        />
      </Components.Generic.Popover.Trigger>
      <Components.Generic.Popover.Content
        className={"bn-popover-content bn-form-popover"}
        variant={"form-popover"}
      >
        <Components.Generic.Form.Root>
          <Components.Generic.Form.TextInput
            name={"file-name"}
            icon={<RiFontFamily />}
            value={currentEditingName || ""}
            autoFocus={true}
            placeholder={
              dict.formatting_toolbar.file_rename.input_placeholder[
                block.type
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
