import {
  blockHasType,
  BlockSchema,
  editorHasBlockWithType,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { ChangeEvent, useCallback, useState } from "react";
import { RiInputField } from "react-icons/ri";

import { useComponentsContext } from "../../../editor/ComponentsContext.js";
import { ScreenReaderOnlySubmit } from "../../Form/ScreenReaderOnlySubmit.js";
import { useUIMode } from "../../../editor/UIModeContext.js";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor.js";
import { useEditorState } from "../../../hooks/useEditorState.js";
import { useDictionary } from "../../../i18n/dictionary.js";

export const FileCaptionButton = () => {
  const dict = useDictionary();
  const Components = useComponentsContext()!;
  const uiMode = useUIMode();

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

  const [popoverOpen, setPopoverOpenState] = useState(false);

  // Return focus to the editor when closing, so on mobile the on-screen
  // keyboard and formatting toolbar stay up instead of being dismissed as
  // focus falls back to `<body>`.
  const setPopoverOpen = useCallback(
    (open: boolean) => {
      if (!open) {
        editor.focus();
      }
      setPopoverOpenState(open);
    },
    [editor],
  );

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

  if (block === undefined) {
    return null;
  }

  return (
    <Components.Generic.Popover.Root
      open={popoverOpen}
      onOpenChange={setPopoverOpen}
      // On mobile the formatting toolbar scrolls horizontally, which clips the
      // inline popover. Portalling it to `editor.portalElement` escapes that
      // clip; a set `portalRoot` also stops focus moving into the popover, which
      // would blur the editor and dismiss the on-screen keyboard. On desktop
      // there's no such clipping, so we keep the default inline rendering. See
      // `MobileFormattingToolbarController`.
      portalRoot={uiMode === "mobile" ? editor.portalElement : undefined}
    >
      <Components.Generic.Popover.Trigger>
        <Components.FormattingToolbar.Button
          className={"bn-button"}
          label={dict.formatting_toolbar.file_caption.tooltip}
          mainTooltip={dict.formatting_toolbar.file_caption.tooltip}
          icon={<RiInputField />}
          onClick={() => setPopoverOpen(!popoverOpen)}
        />
      </Components.Generic.Popover.Trigger>
      <Components.Generic.Popover.Content
        className={"bn-popover-content bn-form-popover"}
        variant={"form-popover"}
      >
        <Components.Generic.Form.Root
          onSubmit={() => setPopoverOpen(false)}
          submitButton={<ScreenReaderOnlySubmit />}
        >
          <Components.Generic.Form.TextInput
            name={"file-caption"}
            icon={<RiInputField />}
            value={block.props.caption}
            autoFocus={true}
            placeholder={dict.formatting_toolbar.file_caption.input_placeholder}
            onChange={handleChange}
          />
        </Components.Generic.Form.Root>
      </Components.Generic.Popover.Content>
    </Components.Generic.Popover.Root>
  );
};
