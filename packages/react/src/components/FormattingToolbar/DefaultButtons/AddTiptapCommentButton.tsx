import { BlockSchema, InlineContentSchema, StyleSchema } from "@blocknote/core";
import { useCallback } from "react";
import { RiChat3Line } from "react-icons/ri";

import { useComponentsContext } from "../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor.js";
import { useDictionary } from "../../../i18n/dictionary.js";

/**
 * This comment button shows when a addPendingComment command is available on the underlying tiptap editor.
 */
export const AddTiptapCommentButton = () => {
  const dict = useDictionary();
  const Components = useComponentsContext()!;

  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const onClick = useCallback(() => {
    (editor._tiptapEditor as any).chain().focus().addPendingComment().run();
  }, [editor]);

  if (
    // We manually check if a comment extension (like liveblocks) is installed
    // By adding default support for this, the user doesn't need to customize the formatting toolbar
    !(editor._tiptapEditor.commands as any)["addPendingComment"] ||
    !editor.isEditable
  ) {
    return null;
  }

  return (
    <Components.FormattingToolbar.Button
      className={"bn-button"}
      label={dict.formatting_toolbar.comment.tooltip}
      mainTooltip={dict.formatting_toolbar.comment.tooltip}
      icon={<RiChat3Line />}
      onClick={onClick}
    />
  );
};
