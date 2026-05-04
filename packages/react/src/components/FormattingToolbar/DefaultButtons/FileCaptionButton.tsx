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
  useState,
} from "react";
import { RiInputField } from "react-icons/ri";

import { useComponentsContext } from "../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor.js";
import { useEditorState } from "../../../hooks/useEditorState.js";
import { useDictionary } from "../../../i18n/dictionary.js";

export const FileCaptionButton = () => {
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
          caption: "string",
        })
      ) {
        return undefined;
      }

      return block;
    },
  });

  const [popoverOpen, setPopoverOpen] = useState(false);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (
        block !== undefined &&
        editorHasBlockWithType(editor, block.type, {
          caption: "string",
        })
      ) {
        editor.updateBlock(block.id, {
          props: {
            caption: event.currentTarget.value,
          },
        });
      }
    },
    [block, editor],
  );

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      setPopoverOpen(false);
    }
  }, []);

  if (block === undefined) {
    return null;
  }

  return (
    <Components.Generic.Popover.Root
      open={popoverOpen}
      onOpenChange={setPopoverOpen}
    >
      <Components.Generic.Popover.Trigger>
        <Components.FormattingToolbar.Button
          className={"bn-button"}
          label={dict.formatting_toolbar.file_caption.tooltip}
          mainTooltip={dict.formatting_toolbar.file_caption.tooltip}
          icon={<RiInputField />}
          onClick={() => setPopoverOpen((open) => !open)}
        />
      </Components.Generic.Popover.Trigger>
      <Components.Generic.Popover.Content
        className={"bn-popover-content bn-form-popover"}
        variant={"form-popover"}
      >
        <Components.Generic.Form.Root>
          <Components.Generic.Form.TextInput
            name={"file-caption"}
            icon={<RiInputField />}
            value={block.props.caption}
            autoFocus={true}
            placeholder={dict.formatting_toolbar.file_caption.input_placeholder}
            onKeyDown={handleKeyDown}
            onChange={handleChange}
          />
        </Components.Generic.Form.Root>
      </Components.Generic.Popover.Content>
    </Components.Generic.Popover.Root>
  );
};
