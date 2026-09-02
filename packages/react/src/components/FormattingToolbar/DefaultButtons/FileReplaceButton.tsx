import {
  blockHasType,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { RiImageEditFill } from "react-icons/ri";

import { useComponentsContext } from "../../../editor/ComponentsContext.js";
import { usePortalContext } from "../../../editor/PortalContext.js";
import { useUIMode } from "../../../editor/UIModeContext.js";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor.js";
import { useEditorState } from "../../../hooks/useEditorState.js";
import { useDictionary } from "../../../i18n/dictionary.js";
import { FilePanel } from "../../FilePanel/FilePanel.js";

export const FileReplaceButton = () => {
  const dict = useDictionary();
  const Components = useComponentsContext()!;
  const uiMode = useUIMode();
  const portalContext = usePortalContext();
  // Only portal (and suppress dropdown focus) in the mobile toolbar; desktop
  // renders inline with default focus behavior.
  const portalRoot =
    uiMode === "mobile" ? (portalContext ?? undefined) : undefined;

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
        })
      ) {
        return undefined;
      }

      return block;
    },
  });

  if (block === undefined) {
    return null;
  }

  return (
    <Components.Generic.Popover.Root
      onOpenChange={(open) => {
        // Return focus to the editor when closing, so on mobile the on-screen
        // keyboard and formatting toolbar stay up instead of being dismissed as
        // focus falls back to `<body>`.
        if (!open) {
          editor.focus();
        }
      }}
      portalRoot={portalRoot}
    >
      <Components.Generic.Popover.Trigger>
        <Components.FormattingToolbar.Button
          className={"bn-button"}
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
        variant={"panel-popover"}
      >
        <FilePanel blockId={block.id} />
      </Components.Generic.Popover.Content>
    </Components.Generic.Popover.Root>
  );
};
