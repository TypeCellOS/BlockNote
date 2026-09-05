import {
  blockHasType,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { useCallback, useEffect, useState } from "react";
import { RiImageEditFill } from "react-icons/ri";

import { useComponentsContext } from "../../../editor/ComponentsContext.js";
import { usePortalElement } from "../../../editor/PortalElementOverride.js";
import { useUIMode } from "../../../editor/UIModeContext.js";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor.js";
import { useEditorState } from "../../../hooks/useEditorState.js";
import { useDictionary } from "../../../i18n/dictionary.js";
import { FilePanel } from "../../FilePanel/FilePanel.js";

export const FileReplaceButton = () => {
  const dict = useDictionary();
  const Components = useComponentsContext()!;
  const uiMode = useUIMode();
  const portalElement = usePortalElement();

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

  // Close once a file is chosen (the block's url changes on both embed and
  // upload). The popover must close itself: the desktop toolbar unmounts on
  // completion-adjacent updates, but the mobile toolbar stays mounted, so an
  // uncontrolled popover would linger over it.
  const currentUrl = (block?.props as { url?: string } | undefined)?.url;
  useEffect(() => {
    setPopoverOpen(false);
  }, [currentUrl, setPopoverOpen]);

  if (block === undefined) {
    return null;
  }

  return (
    <Components.Generic.Popover.Root
      open={popoverOpen}
      onOpenChange={setPopoverOpen}
      portalElement={portalElement}
      preventFocusOnOpen={uiMode === "mobile"}
    >
      <Components.Generic.Popover.Trigger>
        <Components.FormattingToolbar.Button
          className={"bn-button"}
          data-test="replaceFile"
          mainTooltip={
            dict.formatting_toolbar.file_replace.tooltip[block.type] ||
            dict.formatting_toolbar.file_replace.tooltip["file"]
          }
          label={
            dict.formatting_toolbar.file_replace.tooltip[block.type] ||
            dict.formatting_toolbar.file_replace.tooltip["file"]
          }
          icon={<RiImageEditFill />}
          onClick={() => setPopoverOpen(!popoverOpen)}
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
