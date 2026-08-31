import {
  blockHasType,
  BlockSchema,
  editorHasBlockWithType,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { ChangeEvent, KeyboardEvent, useCallback, useState } from "react";
import { RiInputField } from "react-icons/ri";

import { useComponentsContext } from "../../../editor/ComponentsContext.js";
import { useMobileToolbarPortal } from "../../../editor/MobileToolbarPortalContext.js";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor.js";
import { useEditorState } from "../../../hooks/useEditorState.js";
import { useDictionary } from "../../../i18n/dictionary.js";

export const FileCaptionButton = () => {
  const dict = useDictionary();
  const Components = useComponentsContext()!;
  const mobileToolbarPortal = useMobileToolbarPortal();

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

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Enter" && !event.nativeEvent.isComposing) {
        event.preventDefault();
        setPopoverOpen(false);
      }
    },
    [setPopoverOpen],
  );

  if (block === undefined) {
    return null;
  }

  return (
    <Components.Generic.Popover.Root
      open={popoverOpen}
      onOpenChange={setPopoverOpen}
      // On mobile, portal the popover into the toolbar's themed body-level
      // container (see `MobileFormattingToolbarController`) so it escapes the
      // editor's scroll container overflow instead of being clipped, while
      // staying styled. A set `portalRoot` also stops focus moving into the
      // popover, which would blur the editor and dismiss the on-screen keyboard.
      // On desktop it's `undefined`, keeping the default inline rendering.
      portalRoot={mobileToolbarPortal ?? undefined}
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
