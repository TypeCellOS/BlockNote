import {
  blockHasType,
  BlockSchema,
  editorHasBlockWithType,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { ChangeEvent, KeyboardEvent, useCallback, useState } from "react";
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

  const [currentEditingName, setCurrentEditingName] = useState<string>();

  const state = useEditorState({
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

      setCurrentEditingName(block.props.name);
      return {
        blockId: block.id,
        blockType: block.type,
        name: block.props.name,
      };
    },
  });

  const handleEnter = useCallback(
    (event: KeyboardEvent) => {
      if (
        state !== undefined &&
        editorHasBlockWithType(editor, state.blockType, {
          name: "string",
        }) &&
        event.key === "Enter"
      ) {
        event.preventDefault();
        editor.updateBlock(state.blockId, {
          props: {
            name: currentEditingName,
          },
        });
      }
    },
    [currentEditingName, editor, state],
  );

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) =>
      setCurrentEditingName(event.currentTarget.value),
    [],
  );

  if (state === undefined) {
    return null;
  }

  return (
    <Components.Generic.Popover.Root>
      <Components.Generic.Popover.Trigger>
        <Components.FormattingToolbar.Button
          className={"bn-button"}
          label={
            dict.formatting_toolbar.file_rename.tooltip[state.blockType] ||
            dict.formatting_toolbar.file_rename.tooltip["file"]
          }
          mainTooltip={
            dict.formatting_toolbar.file_rename.tooltip[state.blockType] ||
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
                state.blockType
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
